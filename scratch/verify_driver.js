
import { pool } from '../src/db/index.js';

async function verify() {
  try {
    await pool.execute(
      "UPDATE Driver SET verification_status = 'Verified' WHERE driver_id = (SELECT user_id FROM User WHERE email = ?)",
      ['ali@gmail.com']
    );
    console.log('✅ Driver ali@gmail.com has been verified!');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    process.exit(0);
  }
}

verify();
