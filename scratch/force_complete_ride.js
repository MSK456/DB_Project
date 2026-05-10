import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function updateRideStatus() {
  try {
    const [result] = await pool.execute(
      "UPDATE ride SET status = 'Completed', fare = COALESCE(fare, fare_estimated, 100.00) WHERE ride_id = 3",
      []
    );
    console.log(`Update successful. Rows affected: ${result.affectedRows}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateRideStatus();
