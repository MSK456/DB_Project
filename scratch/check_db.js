import { pool } from "../src/db/index.js";

async function check() {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    console.log("Tables in database:", rows.map(r => Object.values(r)[0]));
    
    const [cols] = await pool.query("DESCRIBE Ride");
    console.log("Columns in Ride table:", cols.map(c => c.Field));

    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error.message);
    process.exit(1);
  }
}

check();
