/**
 * @file scratch/force_complete_rides.js
 * @description Force completes all active rides to reset the system state.
 */
import { pool } from "../src/db/index.js";

async function forceComplete() {
  try {
    console.log("🔍 Checking for active rides...");
    const [activeRides] = await pool.query(
      "SELECT ride_id, rider_id, driver_id, status FROM ride WHERE status NOT IN ('Completed', 'Cancelled')"
    );

    if (activeRides.length === 0) {
      console.log("✅ No active rides found.");
    } else {
      console.log(`🚀 Found ${activeRides.length} active rides. Force completing...`);
      
      for (const ride of activeRides) {
        // 1. Mark ride as completed
        await pool.query(
          "UPDATE ride SET status = 'Completed', end_time = CURRENT_TIMESTAMP WHERE ride_id = ?",
          [ride.ride_id]
        );
        
        // 2. Free up driver
        if (ride.driver_id) {
          await pool.query(
            "UPDATE driver SET availability_status = 'Online' WHERE driver_id = ?",
            [ride.driver_id]
          );
        }
        
        console.log(`   - Ride ${ride.ride_id} (Rider ${ride.rider_id}) completed.`);
      }
      console.log("✅ All active rides have been force-completed.");
    }

  } catch (error) {
    console.error("❌ Error force completing rides:", error);
  } finally {
    process.exit(0);
  }
}

forceComplete();
