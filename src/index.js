/**
 * @file src/index.js
 * @description Application entry point for RideFlow backend.
 *              Environment variables are loaded via --env-file .env in the npm script,
 *              which ensures they are available before any ESM module is evaluated.
 *              NOTE: In ESM, static imports are hoisted above all code — calling
 *              dotenv.config() inside this file fires AFTER db/index.js already ran,
 *              meaning the pool is created with empty env vars. --env-file avoids this.
 */

import { connectDB } from "./db/index.js";
import { runDBSetup } from "./db/setup.js";
import { app } from "./app.js";

// ── Startup sequence ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8000;

/**
 * Starts the Express server after verifying the MySQL connection is healthy.
 * If the DB is unreachable, connectDB() calls process.exit(1).
 */
const startServer = async () => {
  try {
    await connectDB();
    await runDBSetup();

    app.listen(PORT, () => {
      console.log(`🚀  RideFlow server running on port ${PORT}`);
      console.log(`📍  API base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error("❌  Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();