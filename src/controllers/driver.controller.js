/**
 * @file src/controllers/driver.controller.js
 */
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  findDriverById,
  hasVerifiedVehicle,
  updateAvailabilityStatus,
  getDriverProfile,
  getDriverStats,
  updateDriverLocation,
  getDriverEarnings
} from "../models/driver.model.js";

/**
 * PATCH /api/v1/driver/availability
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  const { status, city } = req.body;
  const driverId = req.user.userId;

  const driver = await findDriverById(driverId);
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  if (driver.verification_status !== 'Verified') {
    throw new ApiError(403, "Your account is not verified yet");
  }

  if (status === 'Online') {
    const verifiedVehicle = await hasVerifiedVehicle(driverId);
    if (!verifiedVehicle) {
      throw new ApiError(403, "You need at least one verified vehicle to go online");
    }
  } else if (status === 'Offline') {
    if (driver.availability_status === 'On Trip') {
      throw new ApiError(400, "Cannot go offline while on a trip");
    }
  }

  await updateAvailabilityStatus(driverId, status, city);

  return res.status(200).json(
    new ApiResponse(200, { status, city }, "Availability updated successfully")
  );
});

/**
 * GET /api/v1/driver/profile
 */
const fetchDriverProfile = asyncHandler(async (req, res) => {
  const profile = await getDriverProfile(req.user.userId);
  if (!profile.driver) {
    throw new ApiError(404, "Driver not found");
  }

  return res.status(200).json(
    new ApiResponse(200, profile, "Driver profile fetched successfully")
  );
});

/**
 * GET /api/v1/driver/stats
 */
const fetchDriverStats = asyncHandler(async (req, res) => {
  const stats = await getDriverStats(req.user.userId);
  return res.status(200).json(
    new ApiResponse(200, stats, "Driver stats fetched successfully")
  );
});

/**
 * PATCH /api/v1/driver/location
 */
const handleUpdateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const driverId = req.user.userId;

  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  // Basic validation
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Invalid coordinate ranges");
  }

  await updateDriverLocation(driverId, latitude, longitude);

  return res.status(200).json(new ApiResponse(200, null, "Location updated"));
});

/**
 * GET /api/v1/driver/earnings
 */
const fetchDriverEarnings = asyncHandler(async (req, res) => {
  const earnings = await getDriverEarnings(req.user.userId);
  return res.status(200).json(
    new ApiResponse(200, earnings, "Earnings history fetched successfully")
  );
});

export { toggleAvailability, fetchDriverProfile, fetchDriverStats, handleUpdateLocation, fetchDriverEarnings };
