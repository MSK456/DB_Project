import { pool } from '../src/db/index.js';

const runSchemaUpdate = async () => {
  try {
    console.log("🚀 Starting DB Schema Update...");

    // 1. Update Ride status ENUM
    console.log("1. Updating Ride status ENUM...");
    await pool.query(`
      ALTER TABLE ride MODIFY COLUMN status 
      ENUM(
        'Requested',
        'Accepted', 
        'Driver En Route',
        'Arrived at Pickup',
        'In Progress',
        'Completed',
        'Cancelled'
      ) DEFAULT 'Requested';
    `);

    // 2. Add wallet pre-authorization columns
    console.log("2. Adding wallet columns to Ride table...");
    // Check if columns exist first to avoid errors
    const [columns] = await pool.query("SHOW COLUMNS FROM ride");
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('wallet_hold_amount')) {
      await pool.query(`
        ALTER TABLE ride 
        ADD COLUMN wallet_hold_amount DECIMAL(10,2) DEFAULT NULL,
        ADD COLUMN fare_estimated DECIMAL(10,2) DEFAULT NULL,
        ADD COLUMN fare_locked_at TIMESTAMP NULL,
        ADD COLUMN payment_status ENUM('Pending','Held','Paid','Released') DEFAULT 'Pending';
      `);
    }

    // 3. Update trigger after_ride_completed
    console.log("3. Updating trigger after_ride_completed...");
    await pool.query("DROP TRIGGER IF EXISTS after_ride_completed");
    await pool.query(`
      CREATE TRIGGER after_ride_completed
      AFTER UPDATE ON ride
      FOR EACH ROW
      BEGIN
        IF (NEW.status = 'Completed' OR NEW.status = 'Cancelled') AND OLD.status != NEW.status THEN
          INSERT INTO ride_history (
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
      END
    `);

    // 4. Verify Ride_History final_status ENUM
    console.log("4. Verifying Ride_History final_status...");
    await pool.query(`
      ALTER TABLE ride_history MODIFY COLUMN final_status 
      ENUM('Completed', 'Cancelled') DEFAULT 'Completed'
    `);

    console.log("\n✅ ALL ALTERATIONS SUCCEEDED.");

    // Verification
    console.log("\n--- DESCRIBE ride ---");
    const [rideDesc] = await pool.query("DESCRIBE ride");
    console.table(rideDesc);

    console.log("\n--- SHOW TRIGGERS ---");
    const [triggers] = await pool.query("SHOW TRIGGERS LIKE 'ride'");
    console.table(triggers);

    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR DURING SCHEMA UPDATE:", error.message);
    process.exit(1);
  }
};

runSchemaUpdate();
