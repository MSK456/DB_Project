
import { pool } from '../src/db/index.js';

async function check() {
  try {
    const [rows] = await pool.execute(
      'SELECT availability_status, current_city FROM Driver WHERE driver_id = (SELECT user_id FROM User WHERE email = ?)',
      ['ali@gmail.com']
    );
    console.log('Driver Info:', JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();
