/**
 * @file src/routes/auth.routes.js
 * @description Route definitions for all authentication endpoints.
 *              Rate limiting is applied to /login and /register to prevent brute-force.
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";

import { validateBody } from "../middlewares/validate.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  riderRegistrationSchema,
  driverRegistrationSchema,
  loginSchema,
} from "../validators/auth.validators.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
} from "../controllers/auth.controller.js";

import { USER_ROLES } from "../constants.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
//  RATE LIMITERS
//  Applied only to auth-sensitive routes (register + login) to prevent
//  brute-force and credential stuffing attacks.
// ─────────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";

/**
 * Auth rate limiter.
 * - Development: skipped entirely (safe for Postman testing — no 429s)
 * - Production:  max 10 req / 15 min per IP (brute-force protection)
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Skip rate limiting completely in development
  message: {
    statusCode: 429,
    success: false,
    message:
      "Too many requests from this IP. Please try again after 15 minutes.",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  DYNAMIC SCHEMA SELECTOR
//  Selects the appropriate Joi schema based on the role in req.body.
//  This avoids duplicating route definitions for Rider and Driver.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware that selects and runs the correct registration schema validation
 * based on the 'role' field in req.body.
 * @type {import("express").RequestHandler}
 */
const validateRegistration = (req, res, next) => {
  const role = req.body?.role || USER_ROLES.RIDER;
  const schema =
    role === USER_ROLES.DRIVER
      ? driverRegistrationSchema
      : riderRegistrationSchema;
  return validateBody(schema)(req, res, next);
};

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Public. Rate-limited.
 * Accepts an optional profile_photo file upload.
 */
router.post(
  "/register",
  authRateLimiter,
  upload.single("profile_photo"),
  validateRegistration,
  registerUser
);

/**
 * POST /api/v1/auth/login
 * Public. Rate-limited.
 */
router.post("/login", authRateLimiter, validateBody(loginSchema), loginUser);

/**
 * POST /api/v1/auth/logout
 * Protected. Requires a valid access token.
 */
router.post("/logout", verifyJWT, logoutUser);

/**
 * POST /api/v1/auth/refresh-token
 * Public. No rate limit — the refresh token itself acts as the credential.
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * GET /api/v1/auth/me
 * Protected. Returns the currently authenticated user's profile.
 */
router.get("/me", verifyJWT, getCurrentUser);

export default router;
