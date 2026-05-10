/**
 * @file src/controllers/auth.controller.js
 * @description Authentication controller for RideFlow.
 *              Handles: registerUser, loginUser, logoutUser,
 *                       refreshAccessToken, getCurrentUser.
 *
 *              Security rules enforced here:
 *              - Admin cannot self-register via public endpoint.
 *              - Passwords are hashed with bcrypt (saltRounds: 12).
 *              - Tokens are set as httpOnly cookies (no localStorage exposure).
 *              - password_hash and refresh_token are never returned in responses.
 */

import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";
import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  findUserByRefreshToken,
  findDriverByLicense,
  findDriverByCnic,
  createUser,
  createDriverProfile,
  createWallet,
  updateRefreshToken,
  clearRefreshToken,
} from "../models/user.model.js";
import { USER_ROLES, ACCOUNT_STATUS } from "../constants.js";
import { pool } from "../db/index.js";

// ─────────────────────────────────────────────────────────────────────────────
//  COOKIE OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Short-lived cookie for the access token (1 day). */
const accessCookieOptions = {
  httpOnly: true, // Not accessible via client-side JS — prevents XSS theft.
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod.
  sameSite: "strict", // CSRF protection.
  maxAge: 24 * 60 * 60 * 1000, // 1 day in ms.
};

/** Long-lived cookie for the refresh token (10 days). */
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days in ms.
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — sanitise user object for API responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a user object safe to send in API responses.
 * Strips password_hash and refresh_token fields.
 * @param {object} user - Raw user row from the database.
 * @returns {object} Sanitised user object.
 */
const sanitiseUser = (user) => ({
  userId: user.user_id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  account_status: user.account_status,
  profile_photo: user.profile_photo,
  registration_date: user.registration_date,
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLLER: registerUser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Role-based user registration for Rider and Driver.
 * Admin self-registration is blocked (returns 403).
 */
const registerUser = asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    password,
    role = USER_ROLES.RIDER,
    license_number,
    cnic,
  } = req.body;

  // ── 1. Block Admin self-registration ──────────────────────────────────────
  if (role === USER_ROLES.ADMIN) {
    throw new ApiError(
      403,
      "Admin accounts cannot be created via this endpoint."
    );
  }

  // ── 2. Validate that role is one of the allowed public roles ──────────────
  if (![USER_ROLES.RIDER, USER_ROLES.DRIVER].includes(role)) {
    throw new ApiError(400, `Invalid role. Allowed values: Rider, Driver.`);
  }

  // ── 3. Check for duplicate email ──────────────────────────────────────────
  const existingEmailUser = await findUserByEmail(email);
  if (existingEmailUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  // ── 4. Check for duplicate phone ──────────────────────────────────────────
  const existingPhoneUser = await findUserByPhone(phone);
  if (existingPhoneUser) {
    throw new ApiError(
      409,
      "An account with this phone number already exists."
    );
  }

  // ── 5. Driver-specific duplicate checks ───────────────────────────────────
  if (role === USER_ROLES.DRIVER) {
    const existingLicense = await findDriverByLicense(license_number);
    if (existingLicense) {
      throw new ApiError(
        409,
        "A driver account with this license number already exists."
      );
    }

    const existingCnic = await findDriverByCnic(cnic);
    if (existingCnic) {
      throw new ApiError(
        409,
        "A driver account with this CNIC already exists."
      );
    }
  }

  // ── 6. Hash password (saltRounds: 12 — production-grade cost factor) ──────
  const password_hash = await bcrypt.hash(password, 12);

  // ── 7. Handle optional profile photo upload to Cloudinary ─────────────────
  let profile_photo = null;
  if (req.file?.path) {
    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult?.secure_url) {
      profile_photo = uploadResult.secure_url;
    }
  }

  // ── 8. Insert into User table ─────────────────────────────────────────────
  const userId = await createUser({
    full_name,
    email,
    phone,
    password_hash,
    role,
    profile_photo,
  });

  // ── 9. Role-specific secondary profile creation ─────────────────────────
  if (role === USER_ROLES.DRIVER) {
    await createDriverProfile({
      driver_id: userId,
      license_number,
      cnic,
      profile_photo,
    });
    await createWallet(userId);
  }

  // ── 10. Generate tokens ───────────────────────────────────────────────────
  const accessToken = generateAccessToken({ userId, email, role });
  const refreshToken = generateRefreshToken({ userId });

  // ── 11. Store refresh token in DB ─────────────────────────────────────────
  await updateRefreshToken(userId, refreshToken);

  // ── 12. Fetch the new user (to include registration_date etc.) ────────────
  const newUser = await findUserById(userId);

  // ── 13. Set cookies + send response ──────────────────────────────────────
  return res
    .status(201)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: sanitiseUser(newUser),
          accessToken,
        },
        `${role} registered successfully.`
      )
    );
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLLER: loginUser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Authenticates a user and issues new access + refresh tokens.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── 1. Find user by email ─────────────────────────────────────────────────
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, "No account found with this email address.");
  }

  // ── 2. Check account status before comparing passwords ───────────────────
  if (user.account_status === ACCOUNT_STATUS.BANNED) {
    throw new ApiError(403, "Your account has been banned.");
  }
  if (user.account_status === ACCOUNT_STATUS.SUSPENDED) {
    throw new ApiError(403, "Your account has been suspended.");
  }

  // ── 3. Compare password ───────────────────────────────────────────────────
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password.");
  }

  // ── 4. Generate new tokens ────────────────────────────────────────────────
  const { user_id: userId, role } = user;
  const accessToken = generateAccessToken({ userId, email, role });
  const refreshToken = generateRefreshToken({ userId });

  // ── 5. Persist the new refresh token ──────────────────────────────────────
  await updateRefreshToken(userId, refreshToken);

  // ── 6. Send response ──────────────────────────────────────────────────────
  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitiseUser(user),
          accessToken,
        },
        "Logged in successfully."
      )
    );
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLLER: logoutUser  (protected — requires verifyJWT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * Clears the refresh token from the DB and clears both cookies.
 */
const logoutUser = asyncHandler(async (req, res) => {
  // req.user is populated by the verifyJWT middleware.
  await clearRefreshToken(req.user.userId);

  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", clearOptions)
    .clearCookie("refreshToken", clearOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully."));
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLLER: refreshAccessToken
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh-token
 * Issues a new access token (and rotates the refresh token) if the provided
 * refresh token is valid and matches the one stored in the DB.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  // ── 1. Extract refresh token from cookie or body ──────────────────────────
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not provided.");
  }

  // ── 2. Verify the token ───────────────────────────────────────────────────
  const decoded = verifyRefreshToken(incomingRefreshToken);

  // ── 3. Match against DB to detect replay attacks ──────────────────────────
  const user = await findUserByRefreshToken(incomingRefreshToken);
  if (!user || user.user_id !== decoded.userId) {
    throw new ApiError(401, "Invalid refresh token. Please log in again.");
  }

  // ── 4. Generate a new access token and rotate the refresh token ───────────
  const { user_id: userId, email, role } = user;
  const newAccessToken = generateAccessToken({ userId, email, role });
  const newRefreshToken = generateRefreshToken({ userId });

  // ── 5. Update the DB with the rotated refresh token ───────────────────────
  await updateRefreshToken(userId, newRefreshToken);

  // ── 6. Send new tokens ────────────────────────────────────────────────────
  return res
    .status(200)
    .cookie("accessToken", newAccessToken, accessCookieOptions)
    .cookie("refreshToken", newRefreshToken, refreshCookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken: newAccessToken },
        "Access token refreshed successfully."
      )
    );
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLLER: getCurrentUser  (protected — requires verifyJWT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's profile.
 * Fetches fresh data from DB to reflect any status changes.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // Fetch fresh user data to reflect any status changes since token was issued.
  const user = await findUserById(req.user.userId);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: sanitiseUser(user) }, "User fetched successfully.")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
};
