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
    FROM Ride r
    JOIN User ru   ON r.rider_id  = ru.user_id
    JOIN Driver d  ON r.driver_id = d.driver_id
    JOIN User du   ON d.driver_id = du.user_id
    JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
    WHERE r.status IN ('Accepted', 'Driver En Route', 'In Progress')
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW TopDriversView AS
    SELECT d.driver_id, u.full_name, u.email, u.phone,
           d.avg_rating, d.total_trips, d.current_city,
           d.availability_status, d.verification_status
    FROM Driver d
    JOIN User u ON d.driver_id = u.user_id
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
    { name: "idx_ride_rider_id", sql: "CREATE INDEX idx_ride_rider_id ON Ride(rider_id)" },
    { name: "idx_ride_driver_id", sql: "CREATE INDEX idx_ride_driver_id ON Ride(driver_id)" },
    { name: "idx_ride_status", sql: "CREATE INDEX idx_ride_status ON Ride(status)" },
    { name: "idx_ride_city", sql: "CREATE INDEX idx_ride_city ON Ride(pickup_city)" },
    { name: "idx_driver_city", sql: "CREATE INDEX idx_driver_city ON Driver(current_city)" },
    { name: "idx_driver_availability", sql: "CREATE INDEX idx_driver_availability ON Driver(availability_status)" },
    { name: "idx_vehicle_driver", sql: "CREATE INDEX idx_vehicle_driver ON Vehicle(driver_id)" },
    { name: "idx_vehicle_type_status", sql: "CREATE INDEX idx_vehicle_type_status ON Vehicle(vehicle_type, verification_status)" },
    { name: "idx_rating_driver", sql: "CREATE INDEX idx_rating_driver ON Rating(rated_user_id)" },
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
      FROM   Fare_Config
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
  await pool.query(`
    CREATE TRIGGER after_ride_status_change
    AFTER UPDATE ON Ride
    FOR EACH ROW
    BEGIN
      IF NEW.status IN ('Completed', 'Cancelled') AND OLD.status != NEW.status THEN
        INSERT INTO Ride_History (ride_id, final_status)
        VALUES (NEW.ride_id, NEW.status);
      END IF;

      IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        UPDATE Driver
        SET total_trips = total_trips + 1
        WHERE driver_id = NEW.driver_id;
      END IF;
    END
  `);

  await pool.query("DROP TRIGGER IF EXISTS after_rating_inserted");
  await pool.query(`
    CREATE TRIGGER after_rating_inserted
    AFTER INSERT ON Rating
    FOR EACH ROW
    BEGIN
      DECLARE v_avg       DECIMAL(3,2);
      DECLARE v_driver_id INT;
      DECLARE v_admin_id  INT;

      IF NEW.rated_by = 'Rider' THEN
        SET v_driver_id = NEW.rated_user_id;

        SELECT AVG(score) INTO v_avg
        FROM Rating
        WHERE rated_user_id = v_driver_id AND rated_by = 'Rider';

        UPDATE Driver SET avg_rating = ROUND(v_avg, 1)
        WHERE driver_id = v_driver_id;

        IF v_avg < 3.5 THEN
          UPDATE Driver SET verification_status = 'Pending'
          WHERE driver_id = v_driver_id AND verification_status = 'Verified';

          SELECT user_id INTO v_admin_id
          FROM User WHERE role = 'Admin' LIMIT 1;

          IF v_admin_id IS NOT NULL THEN
            INSERT INTO Admin_Log (admin_id, action, target_table, target_id)
            VALUES (
              v_admin_id,
              CONCAT('Driver auto-flagged: avg rating dropped to ', ROUND(v_avg, 1)),
              'Driver',
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
    AFTER UPDATE ON Payment
    FOR EACH ROW
    BEGIN
      IF NEW.payment_status = 'Paid' 
         AND OLD.payment_status != 'Paid' 
         AND NEW.promo_code IS NOT NULL THEN
          UPDATE Promo_Code 
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
        UPDATE Promo_Code
        SET    is_active = FALSE
        WHERE  expiry_date < CURDATE() AND is_active = TRUE
    `);
    console.log("  ✅  Events ready");
  } catch (err) {
    // Event scheduler may require SUPER privilege — log warning, don't crash
    console.warn("  ⚠️   Events skipped (may need SUPER privilege):", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MASTER SETUP RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all idempotent DB object setup steps.
 * Called once from src/index.js after the connection pool is confirmed healthy.
 * @returns {Promise<void>}
 */
const runDBSetup = async () => {
  console.log("⚙️   Running DB setup...");
  await setupViews();
  await setupIndexes();
  await setupStoredProcedures();
  await setupTriggers();
  await setupEvents();
  console.log("✅  DB setup complete.\n");
};

export { runDBSetup };
