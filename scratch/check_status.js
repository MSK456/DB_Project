
import { pool } from '../src/db/index.js';

async function check() {
  try {
    const [rows] = await pool.execute(
      'SELECT verification_status FROM Driver WHERE driver_id = (SELECT user_id FROM User WHERE email = ?)',
      ['ali@gmail.com']
    );
    console.log('Verification Status for ali@gmail.com:', rows[0].verification_status);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();
