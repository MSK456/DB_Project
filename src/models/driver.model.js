/**
 * @file src/models/driver.model.js
 * @description Raw SQL query functions for the Driver table.
 *              No ORM — intentional for the DB course.
 */

import { pool } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Finds a driver row by their user_id (driver_id is same as user_id).
 * @param {number} driverId
 * @returns {Promise<object|null>}
 */
const findDriverById = async (driverId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM Driver WHERE driver_id = ? LIMIT 1",
      [driverId]
    );
    return rows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: findDriverById — " + error.message);
  }
};

/**
 * Checks whether a driver has at least one vehicle with verification_status = 'Verified'.
 * @param {number} driverId
 * @returns {Promise<boolean>}
 */
const hasVerifiedVehicle = async (driverId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM Vehicle
       WHERE driver_id = ? AND verification_status = 'Verified'`,
      [driverId]
    );
    return rows[0].cnt > 0;
  } catch (error) {
    throw new ApiError(500, "DB Error: hasVerifiedVehicle — " + error.message);
  }
};

/**
 * Updates a driver's availability status and current city.
 * @param {number} driverId
 * @param {'Online'|'Offline'|'On Trip'} status
 * @param {string} [city]
 * @returns {Promise<void>}
 */
const updateAvailabilityStatus = async (driverId, status, city = null) => {
  try {
    if (city) {
      await pool.execute(
        "UPDATE Driver SET availability_status = ?, current_city = ? WHERE driver_id = ?",
        [status, city, driverId]
      );
    } else {
      await pool.execute(
        "UPDATE Driver SET availability_status = ? WHERE driver_id = ?",
        [status, driverId]
      );
    }
  } catch (error) {
    throw new ApiError(500, "DB Error: updateAvailabilityStatus — " + error.message);
  }
};

/**
 * Fetches a driver's full profile with their vehicle list.
 * @param {number} driverId
 * @returns {Promise<{driver: object, vehicles: object[]}>}
 */
const getDriverProfile = async (driverId) => {
  try {
    const [driverRows] = await pool.execute(
      `SELECT d.*, u.full_name, u.email, u.phone, u.profile_photo,
              u.account_status, u.registration_date,
              w.balance AS wallet_balance
       FROM Driver d
       JOIN User u ON d.driver_id = u.user_id
       LEFT JOIN Wallet w ON w.driver_id = d.driver_id
       WHERE d.driver_id = ?`,
      [driverId]
    );

    const [vehicles] = await pool.execute(
      "SELECT * FROM Vehicle WHERE driver_id = ?",
      [driverId]
    );

    return { driver: driverRows[0] || null, vehicles };
  } catch (error) {
    throw new ApiError(500, "DB Error: getDriverProfile — " + error.message);
  }
};

/**
 * Returns aggregate stats for a driver: trips, rating, wallet balance,
 * and earnings this calendar month.
 * @param {number} driverId
 * @returns {Promise<object>}
 */
const getDriverStats = async (driverId) => {
  try {
    const [statsRows] = await pool.execute(
      `SELECT d.total_trips, d.avg_rating, d.current_city,
              d.availability_status, d.verification_status,
              w.balance AS wallet_balance,
              COALESCE(SUM(p.amount), 0) AS earnings_this_month
       FROM Driver d
       LEFT JOIN Wallet w ON w.driver_id = d.driver_id
       LEFT JOIN Ride r
         ON r.driver_id = d.driver_id
         AND r.status = 'Completed'
         AND MONTH(r.end_time) = MONTH(CURDATE())
         AND YEAR(r.end_time)  = YEAR(CURDATE())
       LEFT JOIN Payment p ON p.ride_id = r.ride_id
         AND p.payment_status = 'Paid'
       WHERE d.driver_id = ?
       GROUP BY d.driver_id, w.balance`,
      [driverId]
    );
    return statsRows[0] || null;
  } catch (error) {
    throw new ApiError(500, "DB Error: getDriverStats — " + error.message);
  }
};

export {
  findDriverById,
  hasVerifiedVehicle,
  updateAvailabilityStatus,
  getDriverProfile,
  getDriverStats,
};
