/**
 * @file src/app.js
 * @description Express application setup for RideFlow backend.
 *              Configures all global middleware, security headers, CORS, parsers,
 *              mounts the master router, and attaches the global error handler.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import masterRouter from "./routes/index.js";
import { ApiResponse } from "./utils/ApiResponse.js";

const app = express();

app.use(
  cors({
    origin: true, // Reflects the request origin, allowing all
    credentials: true,
  })
);

// ─────────────────────────────────────────────────────────────────────────────
//  SECURITY HEADERS  (helmet sets ~15 HTTP security headers by default)
//  Examples: X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ─────────────────────────────────────────────────────────────────────────────
//  BODY PARSERS
// ─────────────────────────────────────────────────────────────────────────────

// Parse incoming JSON payloads (limited to 16 kb to prevent DoS via large bodies).
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded form data (extended: true allows nested objects).
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Debug logger (Force on for troubleshooting)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const hasBody = req.body && Object.keys(req.body).length > 0;
  console.log("Body:", hasBody ? JSON.stringify(req.body, null, 2) : "(empty)");
  next();
});

// Serve static files from the public directory (e.g., temp uploads before Cloudinary).
app.use(express.static("public"));

// Parse Cookie header and attach cookies to req.cookies.
app.use(cookieParser());

app.use("/api/v1", masterRouter);

// Root route welcome message
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to RideFlow API",
    version: "1.0.0",
    status: "Live",
    endpoints: {
      health: "/health",
      api: "/api/v1"
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  HEALTH CHECK ROUTE
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json(new ApiResponse(200, { status: "ok" }, "RideFlow API is running."));
});

// ─────────────────────────────────────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
//  This must be the LAST middleware registered. It catches any error passed
//  to next(err) from any route or middleware in the app.
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json(
    new ApiResponse(statusCode, err.errors?.length ? err.errors : null, message)
  );
});

export { app };