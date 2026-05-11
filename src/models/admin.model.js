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
 * Returns a comprehensive system overview with multiple KPIs.
 */
const getSystemOverview = async () => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM User WHERE role = 'Rider') AS total_riders,
        (SELECT COUNT(*) FROM User WHERE role = 'Driver') AS total_drivers,
        (SELECT COUNT(*) FROM Driver WHERE availability_status = 'Online') AS online_drivers,
        (SELECT COUNT(*) FROM Ride WHERE DATE(request_time) = CURDATE()) AS rides_today,
        (SELECT COALESCE(SUM(amount), 0) FROM Payment 
         WHERE payment_status = 'Paid' AND DATE(transaction_date) = CURDATE()) AS revenue_today,
        (SELECT COUNT(*) FROM Vehicle WHERE verification_status = 'Pending') AS pending_vehicles,
        (SELECT COUNT(*) FROM Driver WHERE avg_rating < 3.5 AND verification_status = 'Verified') AS low_rated_drivers,
        (SELECT COUNT(*) FROM Payout_Request WHERE status = 'Pending') AS pending_payouts,
        (SELECT COUNT(*) FROM User WHERE account_status IN ('Suspended', 'Banned')) AS restricted_users
    `);
    return rows[0];
  } catch (e) {
    throw new ApiError(500, "DB Error: getSystemOverview - " + e.message);
  }
};

/**
 * Returns a filtered and paginated list of users with driver stats.
 */
const getUsersFiltered = async ({ role, status, search, page = 1, limit = 20 }) => {
  try {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT u.*, 
        CASE WHEN u.role = 'Driver' THEN d.avg_rating ELSE NULL END AS driver_rating,
        CASE WHEN u.role = 'Driver' THEN d.verification_status ELSE NULL END AS driver_verification,
        CASE WHEN u.role = 'Driver' THEN d.total_trips ELSE NULL END AS total_trips
      FROM User u
      LEFT JOIN Driver d ON d.driver_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'All') {
      sql += " AND u.role = ?";
      params.push(role);
    }
    if (status && status !== 'All') {
      sql += " AND u.account_status = ?";
      params.push(status);
    }
    if (search) {
      sql += " AND (u.full_name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY u.registration_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getUsersFiltered - " + e.message);
  }
};

/**
 * Updates fare configuration for a vehicle type.
 */
const updateFareConfig = async (vehicleType, data) => {
  try {
    const { base_rate, per_km_rate, per_min_rate, surge_multiplier, commission_rate } = data;
    await pool.execute(
      `UPDATE Fare_Config 
       SET base_rate = ?, per_km_rate = ?, per_min_rate = ?, surge_multiplier = ?, commission_rate = ?
       WHERE vehicle_type = ?`,
      [base_rate, per_km_rate, per_min_rate, surge_multiplier, commission_rate, vehicleType]
    );
    const [rows] = await pool.execute(`SELECT * FROM Fare_Config WHERE vehicle_type = ?`, [vehicleType]);
    return rows[0];
  } catch (e) {
    throw new ApiError(500, "DB Error: updateFareConfig - " + e.message);
  }
};

/**
 * Gets all fare configurations.
 */
const getFareConfigs = async () => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM Fare_Config`);
    return rows;
  } catch (e) {
    throw new ApiError(500, "DB Error: getFareConfigs - " + e.message);
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
  logAdminAction,
  getSystemOverview,
  getUsersFiltered,
  updateFareConfig,
  getFareConfigs
};

