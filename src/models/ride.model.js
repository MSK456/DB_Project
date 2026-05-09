/**
 * @file src/models/ride.model.js
 * @description Raw SQL query functions for Ride, Ride_History, and Payment tables.
 */

import { pool } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

const ACTIVE_STATUSES = ["Requested", "Accepted", "Driver En Route", "In Progress"];

/** Full ride row with all participant + vehicle joins. */
const findRideById = async (rideId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*,
              ru.full_name AS rider_name, ru.phone AS rider_phone,
              du.full_name AS driver_name, du.phone AS driver_phone,
              d.avg_rating AS driver_rating,
              v.make, v.model, v.color, v.license_plate, v.vehicle_type
       FROM Ride r
       JOIN  User ru   ON r.rider_id  = ru.user_id
       LEFT JOIN Driver d   ON r.driver_id = d.driver_id
       LEFT JOIN User du    ON d.driver_id = du.user_id
       LEFT JOIN Vehicle v  ON r.vehicle_id = v.vehicle_id
       WHERE r.ride_id = ?`,
      [rideId]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findRideById — " + e.message); }
};

/** Returns true if rider has any active ride. */
const hasActiveRide = async (riderId) => {
  try {
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(",");
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM Ride WHERE rider_id = ? AND status IN (${placeholders})`,
      [riderId, ...ACTIVE_STATUSES]
    );
    return rows[0].cnt > 0;
  } catch (e) { throw new ApiError(500, "DB Error: hasActiveRide — " + e.message); }
};

/** Core driver-matching query — returns best available driver or null. */
const findAvailableDriver = async (vehicleType, city) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.driver_id, u.full_name, d.avg_rating, d.current_city,
              v.vehicle_id, v.make, v.model, v.color, v.license_plate, v.vehicle_type
       FROM Driver d
       JOIN User u    ON d.driver_id = u.user_id
       JOIN Vehicle v ON v.driver_id = d.driver_id
       WHERE d.availability_status = 'Online'
         AND d.verification_status = 'Verified'
         AND u.account_status      = 'Active'
         AND v.vehicle_type        = ?
         AND v.verification_status = 'Verified'
         AND d.current_city        = ?
       ORDER BY d.avg_rating DESC
       LIMIT 1`,
      [vehicleType, city]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findAvailableDriver — " + e.message); }
};

/** Inserts a new ride record. Returns the new ride_id. */
const createRide = async ({ rider_id, driver_id, vehicle_id, pickup_location, pickup_city, dropoff_location, dropoff_city }) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO Ride (rider_id, driver_id, vehicle_id, pickup_location, pickup_city, dropoff_location, dropoff_city, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Accepted')`,
      [rider_id, driver_id, vehicle_id, pickup_location, pickup_city, dropoff_location, dropoff_city]
    );
    return result.insertId;
  } catch (e) { throw new ApiError(500, "DB Error: createRide — " + e.message); }
};

/** Active ride for a specific rider. */
const findActiveRideForRider = async (riderId) => {
  try {
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(",");
    const [rows] = await pool.execute(
      `SELECT r.*,
              du.full_name AS driver_name, du.phone AS driver_phone,
              d.avg_rating AS driver_rating,
              v.make, v.model, v.color, v.license_plate
       FROM Ride r
       LEFT JOIN Driver d  ON r.driver_id = d.driver_id
       LEFT JOIN User du   ON d.driver_id = du.user_id
       LEFT JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
       WHERE r.rider_id = ? AND r.status IN (${placeholders})
       ORDER BY r.request_time DESC LIMIT 1`,
      [riderId, ...ACTIVE_STATUSES]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findActiveRideForRider — " + e.message); }
};

/** Active ride assigned to a specific driver. */
const findActiveRideForDriver = async (driverId) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*,
              ru.full_name AS rider_name, ru.phone AS rider_phone,
              v.make, v.model, v.color, v.license_plate
       FROM Ride r
       JOIN User ru        ON r.rider_id  = ru.user_id
       LEFT JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
       WHERE r.driver_id = ? AND r.status IN ('Accepted','Driver En Route','In Progress')
       ORDER BY r.request_time DESC LIMIT 1`,
      [driverId]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findActiveRideForDriver — " + e.message); }
};

/** Sets ride to In Progress with start_time = NOW(). */
const startRide = async (rideId) => {
  try {
    await pool.execute(
      "UPDATE Ride SET status = 'In Progress', start_time = NOW() WHERE ride_id = ?",
      [rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: startRide — " + e.message); }
};

/** Stores distance/duration and end_time before fare is calculated. */
const prepareRideCompletion = async (rideId, distance_km, duration_minutes) => {
  try {
    await pool.execute(
      "UPDATE Ride SET distance_km = ?, duration_minutes = ?, end_time = NOW() WHERE ride_id = ?",
      [distance_km, duration_minutes, rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: prepareRideCompletion — " + e.message); }
};

/** Sets fare and marks ride Completed — triggers fire here. */
const finalizeRide = async (rideId, fare) => {
  try {
    await pool.execute(
      "UPDATE Ride SET fare = ?, status = 'Completed' WHERE ride_id = ?",
      [fare, rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: finalizeRide — " + e.message); }
};

/** Cancels a ride — triggers fire here. */
const cancelRide = async (rideId) => {
  try {
    await pool.execute(
      "UPDATE Ride SET status = 'Cancelled' WHERE ride_id = ?",
      [rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: cancelRide — " + e.message); }
};

/** Paginated ride history for a rider (Completed + Cancelled). */
const getRiderHistory = async (riderId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  try {
    const [rows] = await pool.execute(
      `SELECT r.*,
              du.full_name AS driver_name,
              v.make, v.model, v.license_plate, v.vehicle_type
       FROM Ride r
       LEFT JOIN Driver d  ON r.driver_id = d.driver_id
       LEFT JOIN User du   ON d.driver_id = du.user_id
       LEFT JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
       WHERE r.rider_id = ? AND r.status IN ('Completed','Cancelled')
       ORDER BY r.end_time DESC
       LIMIT ? OFFSET ?`,
      [riderId, limit, offset]
    );
    const [[{ total }]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM Ride WHERE rider_id = ? AND status IN ('Completed','Cancelled')",
      [riderId]
    );
    return { rides: rows, total, page, limit };
  } catch (e) { throw new ApiError(500, "DB Error: getRiderHistory — " + e.message); }
};

/** Creates a Payment record after ride completion. */
const createPayment = async ({ ride_id, rider_id, amount, payment_method = "Cash" }) => {
  try {
    await pool.execute(
      "INSERT INTO Payment (ride_id, rider_id, amount, payment_method) VALUES (?, ?, ?, ?)",
      [ride_id, rider_id, amount, payment_method]
    );
  } catch (e) { throw new ApiError(500, "DB Error: createPayment — " + e.message); }
};

/** Admin: all rides with optional status/city/date filters. */
const getAllRidesAdmin = async ({ status, city, from, to } = {}) => {
  try {
    const conditions = [];
    const params = [];
    if (status) { conditions.push("r.status = ?"); params.push(status); }
    if (city)   { conditions.push("r.pickup_city = ?"); params.push(city); }
    if (from)   { conditions.push("r.request_time >= ?"); params.push(from); }
    if (to)     { conditions.push("r.request_time <= ?"); params.push(to); }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [rows] = await pool.execute(
      `SELECT r.*,
              ru.full_name AS rider_name, ru.phone AS rider_phone,
              du.full_name AS driver_name, du.phone AS driver_phone,
              v.make, v.model, v.license_plate, v.vehicle_type
       FROM Ride r
       JOIN User ru        ON r.rider_id  = ru.user_id
       LEFT JOIN Driver d  ON r.driver_id = d.driver_id
       LEFT JOIN User du   ON d.driver_id = du.user_id
       LEFT JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
       ${where}
       ORDER BY r.request_time DESC`,
      params
    );
    return rows;
  } catch (e) { throw new ApiError(500, "DB Error: getAllRidesAdmin — " + e.message); }
};

export {
  findRideById, hasActiveRide, findAvailableDriver, createRide,
  findActiveRideForRider, findActiveRideForDriver,
  startRide, prepareRideCompletion, finalizeRide, cancelRide,
  getRiderHistory, createPayment, getAllRidesAdmin,
};
