import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function checkColumns() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM vehicle");
    console.log("Columns in 'vehicle' table:");
    console.table(columns);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
