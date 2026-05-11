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
  createDriverWallet,
  createRiderWallet,
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
  httpOnly: true,
  secure: false,
  maxAge: 24 * 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: false,
  maxAge: 10 * 24 * 60 * 60 * 1000,
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
    await createDriverWallet(userId);
  } else if (role === USER_ROLES.RIDER) {
    await createRiderWallet(userId);
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
    secure: false,
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

/**
 * PATCH /api/v1/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone } = req.body;
  const userId = req.user.userId;

  if (full_name && full_name.length < 2) {
    throw new ApiError(400, "Full name must be at least 2 characters");
  }

  if (phone) {
    if (!/^\d{10,15}$/.test(phone)) {
      throw new ApiError(400, "Invalid phone number format");
    }
    const [existing] = await pool.execute(
      'SELECT user_id FROM User WHERE phone = ? AND user_id != ?',
      [phone, userId]
    );
    if (existing.length > 0) {
      throw new ApiError(409, "This phone number is already in use.");
    }
  }

  await pool.execute(
    'UPDATE User SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE user_id = ?',
    [full_name || null, phone || null, userId]
  );

  const updatedUser = await findUserById(userId);
  return res.status(200).json(new ApiResponse(200, { user: sanitiseUser(updatedUser) }, "Profile updated"));
});

/**
 * POST /api/v1/auth/profile/photo
 */
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const uploadResult = await uploadOnCloudinary(req.file.path, {
    folder: 'rideflow/profiles',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });

  if (!uploadResult) {
    throw new ApiError(500, "Failed to upload photo to Cloudinary");
  }

  const profile_photo = uploadResult.secure_url;
  await pool.execute('UPDATE User SET profile_photo = ? WHERE user_id = ?', [profile_photo, req.user.userId]);

  return res.status(200).json(new ApiResponse(200, { profile_photo }, "Profile photo updated"));
});

/**
 * PATCH /api/v1/auth/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user.userId;

  if (new_password !== confirm_password) {
    throw new ApiError(400, "Passwords do not match");
  }

  if (new_password.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters long");
  }

  const user = await pool.execute('SELECT password_hash FROM User WHERE user_id = ?', [userId])
    .then(([rows]) => rows[0]);

  const isMatch = await bcrypt.compare(current_password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const isSame = await bcrypt.compare(new_password, user.password_hash);
  if (isSame) {
    throw new ApiError(400, "New password must be different from current password");
  }

  const hashed = await bcrypt.hash(new_password, 12);
  await pool.execute('UPDATE User SET password_hash = ?, refresh_token = NULL WHERE user_id = ?', [hashed, userId]);

  return res
    .status(200)
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .json(new ApiResponse(200, null, "Password changed. Please log in again."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateProfile,
  uploadProfilePhoto,
  changePassword
};

