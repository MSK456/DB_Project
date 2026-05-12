/**
 * @file src/middlewares/auth.middleware.js
 * @description JWT authentication and role-based authorization middleware.
 *              - verifyJWT: Validates the access token from cookie or Authorization header.
 *              - authorizeRoles: Factory that restricts access to specific user roles.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokenUtils.js";
import { findUserById } from "../models/user.model.js";
import { ACCOUNT_STATUS } from "../constants.js";

// ─────────────────────────────────────────────────────────────────────────────
//  verifyJWT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware that authenticates a request by verifying the JWT access token.
 *
 * Token source priority:
 *   1. req.cookies.accessToken (httpOnly cookie — preferred, browser clients)
 *   2. Authorization: Bearer <token> header (mobile clients / Postman)
 *
 * On success: attaches req.user = { userId, email, role, full_name, account_status }
 * On failure: throws ApiError(401)
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
  // Extract token from cookie or Authorization header.
  const token =
    req.cookies?.accessToken ||
    req.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: No access token provided.");
  }

  // Verify the token signature and expiry. Throws 401 if invalid.
  const decoded = verifyAccessToken(token);

  // Fetch fresh user data from the DB (catches deactivated/banned accounts
  // even if the token itself is still technically valid).
  const user = await findUserById(decoded.userId);

  if (!user) {
    throw new ApiError(401, "Unauthorized: User no longer exists.");
  }

  // Block suspended or banned accounts.
  if (user.account_status === ACCOUNT_STATUS.BANNED) {
    throw new ApiError(403, "Your account has been banned.");
  }
  if (user.account_status === ACCOUNT_STATUS.SUSPENDED) {
    throw new ApiError(403, "Your account has been suspended.");
  }

  // Attach a sanitised user object (no password_hash or refresh_token).
  req.user = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    account_status: user.account_status,
  };

  next();
});

// ─────────────────────────────────────────────────────────────────────────────
//  authorizeRoles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory middleware that restricts a route to specific user roles.
 * Must be used AFTER verifyJWT (which populates req.user).
 *
 * @param {...string} roles - Allowed role strings (e.g. "Admin", "Driver").
 * @returns {Function} Express middleware.
 *
 * @example
 * router.get("/admin/users", verifyJWT, authorizeRoles("Admin"), getUsers);
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role(s): ${roles.join(", ")}.`
        )
      );
    }
    next();
  };
};

export { verifyJWT, authorizeRoles };
