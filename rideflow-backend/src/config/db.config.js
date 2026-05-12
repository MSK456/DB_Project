/**
 * @file src/config/db.config.js
 * @description MySQL connection pool configuration object.
 *              Values are read from environment variables so no secrets live in code.
 */

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "RideFlowDB",
  // Maximum number of concurrent connections in the pool.
  // Excess requests are queued rather than rejected.
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  // Keep-alive pings to prevent stale connections from being dropped by MySQL.
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Automatically re-establish connections if the server closes them.
  waitForConnections: true,
  queueLimit: 0,
};

export default dbConfig;
