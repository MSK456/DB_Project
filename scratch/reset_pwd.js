
import bcrypt from 'bcrypt';
import { pool } from '../src/db/index.js';

async function reset() {
  try {
    const hash = await bcrypt.hash('Password123!', 12);
    await pool.execute('UPDATE User SET password_hash = ? WHERE email = ?', [hash, 'ali@gmail.com']);
    console.log('✅ Password for ali@gmail.com has been reset to: Password123!');
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  } finally {
    process.exit(0);
  }
}

reset();
