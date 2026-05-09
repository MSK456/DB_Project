/**
 * @file src/models/admin.model.js
 * @description Raw SQL query functions for admin operations and reports.
 */

import { pool } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Returns all completed rides for a specific rider.
 * @param {number} riderId
 */
const getRiderCompletedRides = async (riderId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, du.full_name AS driver_name, v.license_plate
       FROM Ride r
       JOIN User du ON r.driver_id = du.user_id
       JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
       WHERE r.rider_id = ? AND r.status = 'Completed'
       ORDER BY r.end_time DESC`,
      [riderId]
    );
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getRiderCompletedRides - " + e.message);
  }
};

/**
 * Returns all drivers in a specific city ordered by rating.
 * @param {string} city
 */
const getDriversByCity = async (city) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name, u.email, u.phone
       FROM Driver d
       JOIN User u ON d.driver_id = u.user_id
       WHERE d.current_city = ?
       ORDER BY d.avg_rating DESC`,
      [city]
    );
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getDriversByCity - " + e.message);
  }
};

/**
 * Returns total revenue grouped by city.
 */
const getRevenueReport = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT pickup_city, SUM(fare) AS total_revenue, COUNT(*) AS ride_count
       FROM Ride
       WHERE status = 'Completed'
       GROUP BY pickup_city`
    );
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getRevenueReport - " + e.message);
  }
};

/**
 * Returns drivers with average rating below 3.5.
 */
const getLowRatedDrivers = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name, u.email
       FROM Driver d
       JOIN User u ON d.driver_id = u.user_id
       WHERE d.avg_rating < 3.5`
    );
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getLowRatedDrivers - " + e.message);
  }
};

/**
 * Returns count of trips per driver.
 */
const getDriverTripCounts = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.driver_id, u.full_name, COUNT(r.ride_id) AS trip_count
       FROM Driver d
       JOIN User u ON d.driver_id = u.user_id
       LEFT JOIN Ride r ON d.driver_id = r.driver_id AND r.status = 'Completed'
       GROUP BY d.driver_id, u.full_name`
    );
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getDriverTripCounts - " + e.message);
  }
};

/**
 * Log an admin action.
 */
const logAdminAction = async (adminId, action, targetTable, targetId) => {
  try {
    await pool.execute(
      `INSERT INTO Admin_Log (admin_id, action, target_table, target_id)
       VALUES (?, ?, ?, ?)`,
      [adminId, action, targetTable, targetId]
    );
  } catch (e) {
    throw new ApiError(500, "DB Error: logAdminAction - " + e.message);
  }
};

export {
  getRiderCompletedRides,
  getDriversByCity,
  getRevenueReport,
  getLowRatedDrivers,
  getDriverTripCounts,
  logAdminAction
};
