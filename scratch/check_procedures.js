import 'dotenv/config';
import { pool } from '../src/db/index.js';

async function checkProcedures() {
  try {
    const [rows] = await pool.query("SHOW PROCEDURE STATUS WHERE Db = 'rideflowdb'");
    console.log('Procedures:', rows.map(r => r.Name));
    
    for (const proc of rows) {
      const [createRow] = await pool.query("SHOW CREATE PROCEDURE " + proc.Name);
      console.log(`--- ${proc.Name} ---`);
      console.log(createRow[0]['Create Procedure']);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkProcedures();
