/**
 * @file src/index.js
 * @description Application entry point for RideFlow backend.
 *              Loads environment variables, tests the MySQL connection,
 *              then starts the Express server. Exits immediately on DB failure.
 */

import dotenv from "dotenv";

// Load .env before any other imports that may reference process.env.
dotenv.config({ path: "./.env" });

import { connectDB } from "./db/index.js";
import { app } from "./app.js";

// ── Startup sequence ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8000;

/**
 * Starts the Express server after verifying the MySQL connection is healthy.
 * If the DB is unreachable, connectDB() will call process.exit(1).
 */
const startServer = async () => {
  try {
    // Verify MySQL connection pool (throws + exits on failure).
    await connectDB();

    // Start listening for HTTP requests only after DB is confirmed healthy.
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