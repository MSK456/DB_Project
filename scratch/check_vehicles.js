
import { pool } from '../src/db/index.js';

async function checkVehicles() {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Vehicle WHERE driver_id = (SELECT user_id FROM User WHERE email = ?)',
      ['ali@gmail.com']
    );
    console.log('Vehicles:', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkVehicles();
