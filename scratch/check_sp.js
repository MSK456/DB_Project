import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function checkSP() {
  try {
    const [rows] = await pool.query("SHOW CREATE PROCEDURE CalculateFare");
    console.log("Procedure Definition:");
    console.log(rows[0]['Create Procedure']);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSP();
