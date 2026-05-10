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
       FROM ride r
       JOIN  user ru   ON r.rider_id  = ru.user_id
       LEFT JOIN driver d   ON r.driver_id = d.driver_id
       LEFT JOIN user du    ON d.driver_id = du.user_id
       LEFT JOIN vehicle v  ON r.vehicle_id = v.vehicle_id
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
      `SELECT COUNT(*) AS cnt FROM ride WHERE rider_id = ? AND status IN (${placeholders})`,
      [riderId, ...ACTIVE_STATUSES]
    );
    return rows[0].cnt > 0;
  } catch (e) { throw new ApiError(500, "DB Error: hasActiveRide — " + e.message); }
};

/** Legacy city-based driver matcher (Fallback). */
const findAvailableDriver = async (vehicleType, city) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.driver_id, v.vehicle_id, u.full_name
       FROM driver d
       JOIN user u ON d.driver_id = u.user_id
       JOIN vehicle v ON v.driver_id = d.driver_id
       WHERE d.availability_status = 'Online'
         AND d.verification_status = 'Verified'
         AND v.vehicle_type = ?
         AND d.current_city = ?
         AND v.verification_status = 'Verified'
       LIMIT 1`,
      [vehicleType, city]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findAvailableDriver — " + e.message); }
};

/** Core driver-matching query — returns candidates within a radius. */
const findAvailableDriversByProximity = async ({ lat, lng, vehicleType, radiusKm = 15, limit = 5 }) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        d.driver_id, u.full_name, u.phone, d.avg_rating, d.current_city,
        d.latitude AS driver_lat, d.longitude AS driver_lng,
        v.vehicle_id, v.make, v.model, v.color, v.license_plate, v.vehicle_type,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
          COS(RADIANS(d.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
        )) AS distance_to_pickup_km
      FROM driver d
      JOIN user u ON d.driver_id = u.user_id
      JOIN vehicle v ON v.driver_id = d.driver_id
      WHERE d.availability_status = 'Online'
        AND d.verification_status = 'Verified'
        AND u.account_status = 'Active'
        AND v.vehicle_type = ?
        AND v.verification_status = 'Verified'
        AND d.latitude IS NOT NULL
        AND d.longitude IS NOT NULL
      HAVING distance_to_pickup_km <= ?
      ORDER BY distance_to_pickup_km ASC
      LIMIT ${Number(limit)}`,
      [lat, lng, lat, vehicleType, radiusKm]
    );
    return rows;
  } catch (e) { throw new ApiError(500, "DB Error: findAvailableDriversByProximity — " + e.message); }
};

/** Inserts a new ride record with coordinates and wallet hold info. */
const createRide = async ({ 
  rider_id, driver_id, vehicle_id, 
  pickup_location, pickup_lat, pickup_lng, pickup_city, 
  dropoff_location, dropoff_lat, dropoff_lng, dropoff_city,
  distance_km = 0, duration_minutes = 0,
  fare_estimated = 0, wallet_hold_amount = 0, payment_status = 'Pending'
}) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO ride (
        rider_id, driver_id, vehicle_id, 
        pickup_location, pickup_lat, pickup_lng, pickup_city, 
        dropoff_location, dropoff_lat, dropoff_lng, dropoff_city, 
        distance_km, duration_minutes,
        fare_estimated, wallet_hold_amount, payment_status,
        status
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Accepted')`,
      [
        rider_id, driver_id, vehicle_id, 
        pickup_location, pickup_lat, pickup_lng, pickup_city, 
        dropoff_location, dropoff_lat, dropoff_lng, dropoff_city,
        distance_km, duration_minutes,
        fare_estimated, wallet_hold_amount, payment_status
      ]
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
       FROM ride r
       LEFT JOIN driver d  ON r.driver_id = d.driver_id
       LEFT JOIN user du   ON d.driver_id = du.user_id
       LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
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
       FROM ride r
       JOIN user ru        ON r.rider_id  = ru.user_id
       LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
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
      "UPDATE ride SET status = 'In Progress', start_time = NOW() WHERE ride_id = ?",
      [rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: startRide — " + e.message); }
};

/** Stores distance/duration and end_time before fare is calculated. */
const prepareRideCompletion = async (rideId, distance_km, duration_minutes) => {
  try {
    await pool.execute(
      "UPDATE ride SET distance_km = ?, duration_minutes = ?, end_time = NOW() WHERE ride_id = ?",
      [distance_km, duration_minutes, rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: prepareRideCompletion — " + e.message); }
};

/** Sets fare and marks ride Completed — triggers fire here. */
const finalizeRide = async (rideId, fare) => {
  try {
    await pool.execute(
      "UPDATE ride SET fare = ?, status = 'Completed' WHERE ride_id = ?",
      [fare, rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: finalizeRide — " + e.message); }
};

/** Cancels a ride — triggers fire here. */
const cancelRide = async (rideId) => {
  try {
    await pool.execute(
      "UPDATE ride SET status = 'Cancelled' WHERE ride_id = ?",
      [rideId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: cancelRide — " + e.message); }
};

/** Paginated ride history for a rider (Completed + Cancelled). */
const getRiderHistory = async (riderId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  try {
    console.log(`[DEBUG] getRiderHistory for rider ${riderId}, page ${page}, limit ${limit}`);
    const sql = `SELECT r.*,
              du.full_name AS driver_name,
              v.make, v.model, v.license_plate, v.vehicle_type
       FROM ride r
       LEFT JOIN driver d  ON r.driver_id = d.driver_id
       LEFT JOIN user du   ON d.driver_id = du.user_id
       LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
       WHERE r.rider_id = ${Number(riderId)} AND r.status IN ('Completed','Cancelled')
       ORDER BY r.end_time DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    
    const [rows] = await pool.query(sql);
    
    const countSql = `SELECT COUNT(*) AS total FROM ride WHERE rider_id = ${Number(riderId)} AND status IN ('Completed','Cancelled')`;
    const [countRows] = await pool.query(countSql);
    const total = countRows[0]?.total || 0;

    return { rides: rows, total, page, limit };
  } catch (e) { throw new ApiError(500, "DB DEBUG Error: getRiderHistory — " + e.message); }
};

/** Creates a Payment record after ride completion. */
const createPayment = async ({ ride_id, rider_id, amount, payment_method = "Cash" }) => {
  try {
    await pool.execute(
      "INSERT INTO payment (ride_id, rider_id, amount, payment_method) VALUES (?, ?, ?, ?)",
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
       FROM ride r
       JOIN user ru        ON r.rider_id  = ru.user_id
       LEFT JOIN driver d  ON r.driver_id = d.driver_id
       LEFT JOIN user du   ON d.driver_id = du.user_id
       LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
       ${where}
       ORDER BY r.request_time DESC`,
      params
    );
    return rows;
  } catch (e) { throw new ApiError(500, "DB Error: getAllRidesAdmin — " + e.message); }
};

export {
  findRideById, hasActiveRide, findAvailableDriver, findAvailableDriversByProximity, createRide,
  findActiveRideForRider, findActiveRideForDriver,
  startRide, prepareRideCompletion, finalizeRide, cancelRide,
  getRiderHistory, createPayment, getAllRidesAdmin,
};
