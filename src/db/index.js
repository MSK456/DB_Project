/**
 * @file src/db/index.js
 * @description Creates and exports a MySQL2 connection pool for use across all models.
 *              Uses mysql2/promise for full async/await support.
 *              Tests the connection on startup; exits the process on failure (fail-fast).
 */

import mysql from "mysql2/promise";
import dbConfig from "../config/db.config.js";

/**
 * The shared MySQL connection pool.
 * All model functions import this pool and call pool.execute() for queries.
 * @type {mysql.Pool}
 */
const pool = mysql.createPool(dbConfig);

/**
 * Verifies that the MySQL connection pool is healthy.
 * Called once from src/index.js during server startup.
 * Throws if the database is unreachable.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(
      `✅  MySQL Connected | Host: ${dbConfig.host} | Database: ${dbConfig.database}`
    );
    connection.release(); // Return the connection back to the pool immediately.
  } catch (error) {
    console.error("❌  MySQL connection FAILED:", error.message);
    process.exit(1); // Fail fast — do not start the server with a broken DB.
  }
};

export { pool, connectDB };
