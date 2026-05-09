/**
 * @file src/models/vehicle.model.js
 * @description Raw SQL query functions for the Vehicle table.
 */

import { pool } from "../db/index.js";
import { ApiError } from "../utils/ApiError.js";

const findVehicleByLicensePlate = async (licensePlate) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM Vehicle WHERE license_plate = ? LIMIT 1", [licensePlate]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findVehicleByLicensePlate — " + e.message); }
};

const findVehicleById = async (vehicleId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM Vehicle WHERE vehicle_id = ? LIMIT 1", [vehicleId]
    );
    return rows[0] || null;
  } catch (e) { throw new ApiError(500, "DB Error: findVehicleById — " + e.message); }
};

const findVehiclesByDriverId = async (driverId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM Vehicle WHERE driver_id = ? ORDER BY vehicle_id DESC", [driverId]
    );
    return rows;
  } catch (e) { throw new ApiError(500, "DB Error: findVehiclesByDriverId — " + e.message); }
};

const createVehicle = async ({ driver_id, make, model, year, color, license_plate, vehicle_type }) => {
  try {
    const [result] = await pool.execute(
      "INSERT INTO Vehicle (driver_id, make, model, year, color, license_plate, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [driver_id, make, model, year, color, license_plate, vehicle_type]
    );
    return result.insertId;
  } catch (e) { throw new ApiError(500, "DB Error: createVehicle — " + e.message); }
};

const updateVehicleVerification = async (vehicleId, status) => {
  try {
    await pool.execute(
      "UPDATE Vehicle SET verification_status = ? WHERE vehicle_id = ?", [status, vehicleId]
    );
  } catch (e) { throw new ApiError(500, "DB Error: updateVehicleVerification — " + e.message); }
};

const getPendingVehicles = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT v.*, u.full_name AS driver_name, u.email AS driver_email, u.phone AS driver_phone
       FROM Vehicle v
       JOIN Driver d ON v.driver_id = d.driver_id
       JOIN User u   ON d.driver_id = u.user_id
       WHERE v.verification_status = 'Pending'
       ORDER BY v.vehicle_id DESC`
    );
    return rows;
  } catch (e) { throw new ApiError(500, "DB Error: getPendingVehicles — " + e.message); }
};

export { findVehicleByLicensePlate, findVehicleById, findVehiclesByDriverId, createVehicle, updateVehicleVerification, getPendingVehicles };
