/**
 * @file src/controllers/admin.controller.js
 */
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  updateVehicleVerification,
  getPendingVehicles
} from "../models/vehicle.model.js";
import {
  getAllRidesAdmin
} from "../models/ride.model.js";
import {
  getRiderCompletedRides,
  getDriversByCity,
  getRevenueReport,
  getLowRatedDrivers,
  getDriverTripCounts,
  logAdminAction
} from "../models/admin.model.js";

/**
 * PATCH /api/v1/admin/vehicles/:vehicleId/verify
 */
const verifyVehicle = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { status } = req.body;

  await updateVehicleVerification(vehicleId, status);
  await logAdminAction(req.user.userId, `Vehicle ${status}: ${vehicleId}`, 'Vehicle', vehicleId);

  return res.status(200).json(new ApiResponse(200, { vehicleId, status }, `Vehicle ${status} successfully`));
});

/**
 * GET /api/v1/admin/vehicles/pending
 */
const fetchPendingVehicles = asyncHandler(async (req, res) => {
  const vehicles = await getPendingVehicles();
  return res.status(200).json(new ApiResponse(200, vehicles, "Pending vehicles fetched"));
});

/**
 * GET /api/v1/admin/rides
 */
const fetchAllRides = asyncHandler(async (req, res) => {
  const rides = await getAllRidesAdmin(req.query);
  return res.status(200).json(new ApiResponse(200, rides, "All rides fetched"));
});

// --- Report Endpoints ---

const reportRiderCompleted = asyncHandler(async (req, res) => {
  const { riderId } = req.query;
  if (!riderId) throw new ApiError(400, "riderId is required");
  const data = await getRiderCompletedRides(riderId);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportDriversByCity = asyncHandler(async (req, res) => {
  const { city } = req.query;
  if (!city) throw new ApiError(400, "city is required");
  const data = await getDriversByCity(city);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportRevenue = asyncHandler(async (req, res) => {
  const data = await getRevenueReport();
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportLowRatedDrivers = asyncHandler(async (req, res) => {
  const data = await getLowRatedDrivers();
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportDriverTripCounts = asyncHandler(async (req, res) => {
  const data = await getDriverTripCounts();
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

export {
  verifyVehicle,
  fetchPendingVehicles,
  fetchAllRides,
  reportRiderCompleted,
  reportDriversByCity,
  reportRevenue,
  reportLowRatedDrivers,
  reportDriverTripCounts
};
