import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function checkFareConfig() {
  try {
    console.log('Checking fare_config table...');
    const [rows] = await pool.query("SELECT * FROM fare_config");
    console.table(rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkFareConfig();
