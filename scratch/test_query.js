import { pool } from "../src/db/index.js";

async function test() {
  try {
    const [rows] = await pool.query("SELECT * FROM rider_wallet LIMIT 1");
    console.log("Success! Found rider_wallet rows:", rows.length);
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

test();
