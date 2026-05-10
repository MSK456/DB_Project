import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function fixHistorySchema() {
  try {
    console.log("🛠 Fixing ride_history schema and triggers...");

    // 1. Drop existing triggers to avoid conflicts
    await pool.query("DROP TRIGGER IF EXISTS after_ride_completed");
    await pool.query("DROP TRIGGER IF EXISTS after_ride_status_change");
    console.log("✅ Triggers dropped.");

    // 2. Add missing columns to ride_history
    const [cols] = await pool.query("SHOW COLUMNS FROM ride_history");
    const colNames = cols.map(c => c.Field);

    const neededCols = [
      { name: 'rider_id', type: 'INT' },
      { name: 'driver_id', type: 'INT' },
      { name: 'vehicle_id', type: 'INT' },
      { name: 'pickup_location', type: 'VARCHAR(255)' },
      { name: 'dropoff_location', type: 'VARCHAR(255)' },
      { name: 'distance_km', type: 'DECIMAL(10,2)' },
      { name: 'duration_minutes', type: 'INT' },
      { name: 'fare_amount', type: 'DECIMAL(10,2)' },
      { name: 'completion_time', type: 'TIMESTAMP' }
    ];

    for (const col of neededCols) {
      if (!colNames.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE ride_history ADD COLUMN ${col.name} ${col.type}`);
      }
    }
    console.log("✅ ride_history columns verified.");

    // 3. Create ONE clean trigger
    await pool.query(`
      CREATE TRIGGER after_ride_completed
      AFTER UPDATE ON ride
      FOR EACH ROW
      BEGIN
        -- Handle history logging
        IF (NEW.status = 'Completed' OR NEW.status = 'Cancelled') AND OLD.status != NEW.status THEN
          INSERT IGNORE INTO ride_history (
            ride_id, rider_id, driver_id, vehicle_id,
            pickup_location, dropoff_location,
            distance_km, duration_minutes, fare_amount,
            final_status, completion_time
          )
          VALUES (
            NEW.ride_id, NEW.rider_id, NEW.driver_id, NEW.vehicle_id,
            NEW.pickup_location, NEW.dropoff_location,
            NEW.distance_km, NEW.duration_minutes, NEW.fare,
            NEW.status, NOW()
          );
        END IF;

        -- Handle driver trip count
        IF NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.driver_id IS NOT NULL THEN
          UPDATE driver
          SET total_trips = total_trips + 1
          WHERE driver_id = NEW.driver_id;
        END IF;
      END
    `);
    console.log("✅ Unified trigger created.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Fix failed:", err);
    process.exit(1);
  }
}

fixHistorySchema();
