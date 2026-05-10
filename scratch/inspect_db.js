import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function cleanupTriggers() {
  try {
    console.log("Dropping redundant trigger 'after_ride_status_change'...");
    await pool.query("DROP TRIGGER IF EXISTS after_ride_status_change");
    console.log("Trigger dropped.");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanupTriggers();
