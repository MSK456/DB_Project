/**
 * @file src/controllers/vehicle.controller.js
 */
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  findVehicleByLicensePlate,
  createVehicle,
  findVehiclesByDriverId
} from "../models/vehicle.model.js";

/**
 * POST /api/v1/vehicles
 */
const addVehicle = asyncHandler(async (req, res) => {
  if (!req.body) {
    throw new ApiError(400, "Request body is missing");
  }
  const { make, model, year, color, license_plate, vehicle_type } = req.body;
  const driverId = req.user.userId;

  const existingVehicle = await findVehicleByLicensePlate(license_plate);
  if (existingVehicle) {
    throw new ApiError(409, "A vehicle with this license plate already exists");
  }

  const vehicleId = await createVehicle({
    driver_id: driverId,
    make,
    model,
    year,
    color,
    license_plate,
    vehicle_type
  });

  return res.status(201).json(
    new ApiResponse(201, { vehicleId }, "Vehicle added successfully. Pending verification.")
  );
});

/**
 * GET /api/v1/vehicles/my
 */
const getMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await findVehiclesByDriverId(req.user.userId);
  return res.status(200).json(
    new ApiResponse(200, vehicles, "Vehicles fetched successfully")
  );
});

export { addVehicle, getMyVehicles };
