import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function fixRideTimes() {
  try {
    const [result] = await pool.execute(
      "UPDATE ride SET end_time = NOW() WHERE ride_id = 3 AND end_time IS NULL",
      []
    );
    console.log(`Update successful. Rows affected: ${result.affectedRows}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixRideTimes();
