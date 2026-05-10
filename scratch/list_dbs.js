import { pool } from "../src/db/index.js";

async function listDBs() {
  try {
    const [rows] = await pool.query("SHOW DATABASES");
    console.log("Databases:", rows.map(r => Object.values(r)[0]));
    process.exit(0);
  } catch (error) {
    console.error("❌ List failed:", error.message);
    process.exit(1);
  }
}

listDBs();
