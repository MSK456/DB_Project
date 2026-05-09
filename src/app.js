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

// ─────────────────────────────────────────────────────────────────────────────
//  SECURITY HEADERS  (helmet sets ~15 HTTP security headers by default)
//  Examples: X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────────────────────────────────────
//  CORS  — allow only the configured frontend origin
// ─────────────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true, // Required to send/receive httpOnly cookies cross-origin.
  })
);

// ─────────────────────────────────────────────────────────────────────────────
//  BODY PARSERS
// ─────────────────────────────────────────────────────────────────────────────

// Parse incoming JSON payloads (limited to 16 kb to prevent DoS via large bodies).
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded form data (extended: true allows nested objects).
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from the public directory (e.g., temp uploads before Cloudinary).
app.use(express.static("public"));

// Parse Cookie header and attach cookies to req.cookies.
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES  — all API routes are versioned under /api/v1
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/v1", masterRouter);

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