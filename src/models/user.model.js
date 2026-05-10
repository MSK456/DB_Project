/**
 * @file src/models/user.model.js
 * @description Raw SQL query functions for the User, Driver, and Wallet tables.
 *              No ORM is used — this is intentional for the Database Systems Lab course
 *              to demonstrate direct SQL interaction and parameterized query safety.
 *
 *              All queries use the `?` placeholder syntax provided by mysql2 to
 *              prevent SQL injection. User input is NEVER concatenated into SQL strings.
 */

import { pool } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

// ─────────────────────────────────────────────────────────────────────────────
//  READ QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds a user by their email address.
 * @param {string} email
 * @returns {Promise<object|null>} User row or null if not found.
 * @throws {ApiError} 500 on database failure.
 */
const findUserByEmail = async (email) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM user WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: findUserByEmail — " + error.message);
  }
};

/**
 * Finds a user by their phone number.
 * @param {string} phone
 * @returns {Promise<object|null>} User row or null if not found.
 * @throws {ApiError} 500 on database failure.
 */
const findUserByPhone = async (phone) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM user WHERE phone = ? LIMIT 1",
      [phone]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: findUserByPhone — " + error.message);
  }
};

/**
 * Finds a user by their primary key (user_id).
 * @param {number} userId
 * @returns {Promise<object|null>} User row or null if not found.
 * @throws {ApiError} 500 on database failure.
 */
const findUserById = async (userId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM user WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: findUserById — " + error.message);
  }
};

/**
 * Finds a user by their stored refresh token.
 * Used during the refresh-token flow to validate token ownership.
 * @param {string} token - Refresh token value stored in the DB.
 * @returns {Promise<object|null>} User row or null if not found.
 * @throws {ApiError} 500 on database failure.
 */
const findUserByRefreshToken = async (token) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM user WHERE refresh_token = ? LIMIT 1",
      [token]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(
      500,
      "DB Error: findUserByRefreshToken — " + error.message
    );
  }
};

/**
 * Finds a driver by their license number (for duplicate check during registration).
 * @param {string} licenseNumber
 * @returns {Promise<object|null>} Driver row or null.
 * @throws {ApiError} 500 on database failure.
 */
const findDriverByLicense = async (licenseNumber) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM driver WHERE license_number = ? LIMIT 1",
      [licenseNumber]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(
      500,
      "DB Error: findDriverByLicense — " + error.message
    );
  }
};

/**
 * Finds a driver by their CNIC (for duplicate check during registration).
 * @param {string} cnic
 * @returns {Promise<object|null>} Driver row or null.
 * @throws {ApiError} 500 on database failure.
 */
const findDriverByCnic = async (cnic) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM driver WHERE cnic = ? LIMIT 1",
      [cnic]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: findDriverByCnic — " + error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  WRITE QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts a new user into the User table.
 * @param {{ full_name: string, email: string, phone: string, password_hash: string, role: string, profile_photo?: string }} userData
 * @returns {Promise<number>} The auto-incremented user_id of the newly created user.
 * @throws {ApiError} 500 on database failure.
 */
const createUser = async ({
  full_name,
  email,
  phone,
  password_hash,
  role,
  profile_photo = null,
}) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO user (full_name, email, phone, password_hash, role, profile_photo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone, password_hash, role, profile_photo]
    );
    return result.insertId;
  } catch (error) {
    throw new ApiError(500, "DB Error: createUser — " + error.message);
  }
};

/**
 * Inserts a new driver profile into the Driver table.
 * The driver_id equals the user_id from the User table (shared PK).
 * @param {{ driver_id: number, license_number: string, cnic: string, profile_photo?: string }} driverData
 * @returns {Promise<void>}
 * @throws {ApiError} 500 on database failure.
 */
const createDriverProfile = async ({
  driver_id,
  license_number,
  cnic,
  profile_photo = null,
}) => {
  try {
    await pool.execute(
      `INSERT INTO driver (driver_id, license_number, cnic, profile_photo)
       VALUES (?, ?, ?, ?)`,
      [driver_id, license_number, cnic, profile_photo]
    );
  } catch (error) {
    throw new ApiError(
      500,
      "DB Error: createDriverProfile — " + error.message
    );
  }
};

/**
 * Inserts a new Wallet record for a Driver with a starting balance of 0.
 * @param {number} driverId - The driver's user_id.
 * @returns {Promise<void>}
 * @throws {ApiError} 500 on database failure.
 */
const createWallet = async (driverId) => {
  try {
    await pool.execute("INSERT INTO wallet (driver_id, balance) VALUES (?, 0)", [
      driverId,
    ]);
  } catch (error) {
    throw new ApiError(500, "DB Error: createWallet — " + error.message);
  }
};

/**
 * Stores a refresh token against a user for session management.
 * @param {number} userId
 * @param {string} token - The refresh token JWT string.
 * @returns {Promise<void>}
 * @throws {ApiError} 500 on database failure.
 */
const updateRefreshToken = async (userId, token) => {
  try {
    await pool.execute(
      "UPDATE user SET refresh_token = ? WHERE user_id = ?",
      [token, userId]
    );
  } catch (error) {
    throw new ApiError(
      500,
      "DB Error: updateRefreshToken — " + error.message
    );
  }
};

/**
 * Clears the refresh token for a user (used during logout to invalidate sessions).
 * @param {number} userId
 * @returns {Promise<void>}
 * @throws {ApiError} 500 on database failure.
 */
const clearRefreshToken = async (userId) => {
  try {
    await pool.execute(
      "UPDATE user SET refresh_token = NULL WHERE user_id = ?",
      [userId]
    );
  } catch (error) {
    throw new ApiError(500, "DB Error: clearRefreshToken — " + error.message);
  }
};

export {
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
};
