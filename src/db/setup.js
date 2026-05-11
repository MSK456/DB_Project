/**
 * @file src/db/setup.js
 * @description Idempotent DB object setup — runs on every server startup.
 *              Creates Views, Indexes, Stored Procedures, Triggers, and Events
 *              if they do not already exist.
 *
 *              NOTE: mysql2 does NOT use DELIMITER. The full CREATE PROCEDURE /
 *              CREATE TRIGGER statement is sent as one string to MySQL, which
 *              parses it correctly without client-side delimiter overrides.
 *              pool.query() (text protocol) is used — NOT pool.execute() —
 *              because DDL statements are not prepared statements.
 */

import { pool } from "./index.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes DCL (Data Control Language) statements from src/sql/dcl.sql
 */
const executeDCL = async () => {
  try {
    console.log("🔐  Applying DCL roles and permissions...");
    const dclPath = path.join(__dirname, '../sql/dcl.sql');
    
    if (!fs.existsSync(dclPath)) {
      console.warn("  ⚠️   dcl.sql not found, skipping DCL setup.");
      return;
    }

    const dclContent = fs.readFileSync(dclPath, 'utf8');
    const statements = dclContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Skip errors for roles/users that already exist (errno 1396, 1227, etc)
        // Or if the environment (Railway) doesn't allow GRANT/REVOKE for the app user
        if (err.errno !== 1396 && err.errno !== 1227 && err.errno !== 1044) {
          console.warn(`  ⚠️   DCL Statement skipped: ${statement.substring(0, 50)}... | Error: ${err.message}`);
        }
      }
    }
    console.log("✅  DCL roles and permissions applied successfully.");
  } catch (err) {
    console.error("❌  Failed to apply DCL:", err.message);
  }
};


// ─────────────────────────────────────────────────────────────────────────────
//  VIEWS
// ─────────────────────────────────────────────────────────────────────────────
const setupViews = async () => {
  await pool.query(`
    CREATE OR REPLACE VIEW ActiveRidesView AS
    SELECT r.ride_id, r.status,
           r.pickup_location, r.pickup_city,
           r.dropoff_location, r.dropoff_city,
           r.request_time, r.start_time,
           ru.full_name AS rider_name, ru.phone AS rider_phone,
           du.full_name AS driver_name, du.phone AS driver_phone,
           d.avg_rating AS driver_rating,
           v.make, v.model, v.color, v.license_plate, v.vehicle_type
    FROM ride r
    JOIN user ru   ON r.rider_id  = ru.user_id
    JOIN driver d  ON r.driver_id = d.driver_id
    JOIN user du   ON d.driver_id = du.user_id
    JOIN vehicle v ON r.vehicle_id = v.vehicle_id
    WHERE r.status IN ('Accepted', 'Driver En Route', 'In Progress')
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW TopDriversView AS
    SELECT d.driver_id, u.full_name, u.email, u.phone,
           d.avg_rating, d.total_trips, d.current_city,
           d.availability_status, d.verification_status
    FROM driver d
    JOIN user u ON d.driver_id = u.user_id
    WHERE d.avg_rating >= 4.5
      AND d.verification_status = 'Verified'
      AND u.account_status = 'Active'
    ORDER BY d.avg_rating DESC, d.total_trips DESC
  `);

  console.log("  ✅  Views ready");
};

// ─────────────────────────────────────────────────────────────────────────────
//  INDEXES
// ─────────────────────────────────────────────────────────────────────────────
const setupIndexes = async () => {
  const indexes = [
    { name: "idx_ride_rider_id", sql: "CREATE INDEX idx_ride_rider_id ON ride(rider_id)" },
    { name: "idx_ride_driver_id", sql: "CREATE INDEX idx_ride_driver_id ON ride(driver_id)" },
    { name: "idx_ride_status", sql: "CREATE INDEX idx_ride_status ON ride(status)" },
    { name: "idx_ride_city", sql: "CREATE INDEX idx_ride_city ON ride(pickup_city)" },
    { name: "idx_driver_city", sql: "CREATE INDEX idx_driver_city ON driver(current_city)" },
    { name: "idx_driver_availability", sql: "CREATE INDEX idx_driver_availability ON driver(availability_status)" },
    { name: "idx_vehicle_driver", sql: "CREATE INDEX idx_vehicle_driver ON vehicle(driver_id)" },
    { name: "idx_vehicle_type_status", sql: "CREATE INDEX idx_vehicle_type_status ON vehicle(vehicle_type, verification_status)" },
    { name: "idx_rating_driver", sql: "CREATE INDEX idx_rating_driver ON rating(rated_user_id)" },
  ];

  for (const idx of indexes) {
    try {
      await pool.query(idx.sql);
    } catch (err) {
      // 1061 is the MySQL error code for "Duplicate key name"
      if (err.errno !== 1061) {
        console.warn(`  ⚠️   Failed to create index ${idx.name}:`, err.message);
      }
    }
  }
  console.log("  ✅  Indexes ready");
};

// ─────────────────────────────────────────────────────────────────────────────
//  STORED PROCEDURES
// ─────────────────────────────────────────────────────────────────────────────
const setupStoredProcedures = async () => {
  await pool.query("DROP PROCEDURE IF EXISTS CalculateFare");

  // No DELIMITER needed when sending via mysql2 — the server parses the full body.
  await pool.query(`
    CREATE PROCEDURE CalculateFare(
      IN  p_distance_km      DECIMAL(8,2),
      IN  p_duration_minutes INT,
      IN  p_vehicle_type     ENUM('Economy', 'Premium', 'Bike'),
      IN  p_is_surge         BOOLEAN,
      OUT p_fare             DECIMAL(10,2)
    )
    BEGIN
      DECLARE v_base_rate  DECIMAL(10,2);
      DECLARE v_per_km     DECIMAL(10,2);
      DECLARE v_per_min    DECIMAL(10,2);
      DECLARE v_surge      DECIMAL(3,2);
      DECLARE v_calculated DECIMAL(10,2);

      SELECT base_rate, per_km_rate, per_min_rate, surge_multiplier
      INTO   v_base_rate, v_per_km, v_per_min, v_surge
      FROM   fare_config
      WHERE  vehicle_type = p_vehicle_type;

      SET v_calculated = v_base_rate
                       + (v_per_km  * p_distance_km)
                       + (v_per_min * p_duration_minutes);

      IF p_is_surge THEN
        SET v_calculated = v_calculated * v_surge;
      END IF;

      SET p_fare = ROUND(v_calculated, 2);
    END
  `);

  console.log("  ✅  Stored procedures ready");
};

// ─────────────────────────────────────────────────────────────────────────────
//  TRIGGERS
// ─────────────────────────────────────────────────────────────────────────────
const setupTriggers = async () => {
  await pool.query("DROP TRIGGER IF EXISTS after_ride_status_change");
  await pool.query("DROP TRIGGER IF EXISTS after_ride_completed");
  await pool.query(`
    CREATE TRIGGER after_ride_completed
    AFTER UPDATE ON ride
    FOR EACH ROW
    BEGIN
      -- Handle history logging (INSERT IGNORE prevents duplicates)
      IF NEW.status IN ('Completed', 'Cancelled') AND OLD.status != NEW.status THEN
        INSERT IGNORE INTO ride_history (ride_id, final_status)
        VALUES (NEW.ride_id, NEW.status);
      END IF;

      -- Handle driver trip count
      IF NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.driver_id IS NOT NULL THEN
        UPDATE driver
        SET total_trips = total_trips + 1
        WHERE driver_id = NEW.driver_id;
      END IF;
    END
  `);

  await pool.query("DROP TRIGGER IF EXISTS after_rating_inserted");
  await pool.query(`
    CREATE TRIGGER after_rating_inserted
    AFTER INSERT ON rating
    FOR EACH ROW
    BEGIN
      DECLARE v_avg       DECIMAL(3,2);
      DECLARE v_driver_id INT;
      DECLARE v_admin_id  INT;

      IF NEW.rated_by = 'Rider' THEN
        SET v_driver_id = NEW.rated_user_id;

        SELECT AVG(score) INTO v_avg
        FROM rating
        WHERE rated_user_id = v_driver_id AND rated_by = 'Rider';

        UPDATE driver SET avg_rating = ROUND(v_avg, 1)
        WHERE driver_id = v_driver_id;

        IF v_avg < 3.5 THEN
          UPDATE driver SET verification_status = 'Pending'
          WHERE driver_id = v_driver_id AND verification_status = 'Verified';

          SELECT user_id INTO v_admin_id
          FROM user WHERE role = 'Admin' LIMIT 1;

          IF v_admin_id IS NOT NULL THEN
            INSERT INTO admin_log (admin_id, action, target_table, target_id)
            VALUES (
              v_admin_id,
              CONCAT('Driver auto-flagged: avg rating dropped to ', ROUND(v_avg, 1)),
              'driver',
              v_driver_id
            );
          END IF;
        END IF;
      END IF;
    END
  `);

  await pool.query("DROP TRIGGER IF EXISTS after_payment_paid_promo");
  await pool.query(`
    CREATE TRIGGER after_payment_paid_promo
    AFTER UPDATE ON payment
    FOR EACH ROW
    BEGIN
      IF NEW.payment_status = 'Paid' 
         AND OLD.payment_status != 'Paid' 
         AND NEW.promo_code IS NOT NULL THEN
          UPDATE promo_code 
          SET usage_count = usage_count + 1
          WHERE code = NEW.promo_code;
      END IF;
    END
  `);

  console.log("  ✅  Triggers ready");
};

// ─────────────────────────────────────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────────────────────────────────────
const setupEvents = async () => {
  try {
    await pool.query("SET GLOBAL event_scheduler = ON");
    await pool.query(`
      CREATE EVENT IF NOT EXISTS expire_promo_codes
      ON SCHEDULE EVERY 1 DAY
      STARTS (TIMESTAMP(CURDATE()) + INTERVAL 1 DAY)
      COMMENT 'Deactivates promo codes whose expiry_date has passed'
      DO
        UPDATE promo_code
        SET    is_active = FALSE
        WHERE  expiry_date < CURDATE() AND is_active = TRUE
    `);
    console.log("  ✅  Events ready");
  } catch (err) {
    // Event scheduler may require SUPER privilege — log warning, don't crash
    console.warn("  ⚠️   Events skipped (may need SUPER privilege):", err.message);
  }
};

/**
 * Seeds the database with default fare configurations.
 */
const seedFareConfig = async () => {
  console.log("🌱  Seeding fare_config...");
  const configs = [
    { type: 'Economy', base: 2.00, km: 1.20, min: 0.20, surge: 1.50 },
    { type: 'Premium', base: 5.00, km: 2.50, min: 0.50, surge: 1.80 },
    { type: 'Bike',    base: 1.00, km: 0.60, min: 0.10, surge: 1.20 }
  ];

  for (const config of configs) {
    await pool.query(`
      INSERT INTO fare_config (vehicle_type, base_rate, per_km_rate, per_min_rate, surge_multiplier)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        base_rate = VALUES(base_rate),
        per_km_rate = VALUES(per_km_rate),
        per_min_rate = VALUES(per_min_rate),
        surge_multiplier = VALUES(surge_multiplier)
    `, [config.type, config.base, config.km, config.min, config.surge]);
  }
  console.log("✅  Fare configuration seeded.");
};

// ─────────────────────────────────────────────────────────────────────────────
//  MASTER SETUP RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all idempotent DB object setup steps.
 * Called once from src/index.js after the connection pool is confirmed healthy.
 * @returns {Promise<void>}
 */
/**
 * Handles incremental schema updates (Altering tables).
 */
const setupSchemaUpdates = async () => {
  console.log("🛠️   Running schema updates...");
  
  // 1. Add unique constraint to Rating (ride_id, rated_by)
  try {
    await pool.query(`
      ALTER TABLE rating ADD CONSTRAINT unique_rating_per_ride_per_side 
      UNIQUE (ride_id, rated_by)
    `);
    console.log("  ✅  Rating uniqueness constraint added");
  } catch (err) {
    if (err.errno !== 1061 && err.errno !== 1060) console.warn("  ⚠️   Constraint skipped:", err.message);
  }

  // 2. Add rating flags to Ride table
  const addColumn = async (col, def) => {
    try {
      await pool.query(`ALTER TABLE ride ADD COLUMN ${col} ${def}`);
      console.log(`  ✅  Column ride.${col} added`);
    } catch (err) {
      if (err.errno !== 1060) console.warn(`  ⚠️   Column ${col} skipped:`, err.message);
    }
  };

  await addColumn('rider_has_rated', 'BOOLEAN DEFAULT FALSE');
  await addColumn('driver_has_rated', 'BOOLEAN DEFAULT FALSE');
};

const runDBSetup = async () => {
  console.log("⚙️   Running DB setup...");
  await setupSchemaUpdates();
  await setupViews();
  await setupIndexes();
  await setupStoredProcedures();
  await setupTriggers();
  await setupEvents();
  await seedFareConfig();
  await executeDCL();
  console.log("✅  DB setup complete.\n");
};

export { runDBSetup };
