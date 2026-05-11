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
  logAdminAction,
  getSystemOverview as getStatsOverview,
  getUsersFiltered,
  updateFareConfig as updateFareModel,
  getFareConfigs as getFareModels
} from "../models/admin.model.js";
import { pool } from "../db/index.js";

/**
 * PATCH /api/v1/admin/users/:userId/status
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  // 1. Fetch user
  const [users] = await pool.execute('SELECT * FROM User WHERE user_id = ?', [userId]);
  if (users.length === 0) throw new ApiError(404, "User not found");
  const user = users[0];

  // 2. Cannot modify other admins
  if (user.role === 'Admin') throw new ApiError(403, "Cannot modify admin accounts");

  // 3. Status check
  if (user.account_status === status) throw new ApiError(400, `User is already ${status}`);

  // 4. Update status
  await pool.execute('UPDATE User SET account_status = ? WHERE user_id = ?', [status, userId]);

  // 5. Cascade to Driver if Banned/Suspended
  if (['Banned', 'Suspended'].includes(status) && user.role === 'Driver') {
    await pool.execute('UPDATE Driver SET availability_status = ? WHERE driver_id = ?', ['Offline', userId]);
  }

  // 6. Log action
  await logAdminAction(
    req.user.userId, 
    `Set user #${userId} status to ${status}. Reason: ${reason || 'Not provided'}`,
    'User',
    userId
  );

  return res.status(200).json(new ApiResponse(200, { userId, new_status: status }, "User status updated"));
});

/**
 * GET /api/v1/admin/overview
 */
const getSystemOverview = asyncHandler(async (req, res) => {
  const stats = await getStatsOverview();
  return res.status(200).json(new ApiResponse(200, stats, "System overview fetched"));
});

/**
 * PATCH /api/v1/admin/fare-config/:vehicleType
 */
const updateFareConfig = asyncHandler(async (req, res) => {
  const { vehicleType } = req.params;
  const { base_rate, per_km_rate, per_min_rate, surge_multiplier, commission_rate } = req.body;

  if (base_rate <= 0 || per_km_rate <= 0 || per_min_rate <= 0 || surge_multiplier <= 0) {
    throw new ApiError(400, "Rates must be greater than zero");
  }
  if (commission_rate < 0 || commission_rate > 1) {
    throw new ApiError(400, "Commission rate must be between 0 and 1");
  }

  const updated = await updateFareModel(vehicleType, req.body);
  await logAdminAction(req.user.userId, `Updated fare config for ${vehicleType}`, 'Fare_Config', vehicleType);

  return res.status(200).json(new ApiResponse(200, updated, "Fare config updated"));
});

/**
 * GET /api/v1/admin/fare-config
 */
const getFareConfigs = asyncHandler(async (req, res) => {
  const configs = await getFareModels();
  return res.status(200).json(new ApiResponse(200, configs, "Fare configs fetched"));
});

/**
 * GET /api/v1/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const users = await getUsersFiltered(req.query);
  return res.status(200).json(new ApiResponse(200, users, "Users fetched"));
});

export {
  verifyVehicle,
  fetchPendingVehicles,
  fetchAllRides,
  reportRevenueByCity,
  reportRevenueByMethod,
  reportDriverEarnings,
  reportLowRatedDriversFull,
  reportTripCountsFull,
  reportAllRiders,
  reportPromoUsage,
  updateUserStatus,
  getSystemOverview,
  updateFareConfig,
  getFareConfigs,
  getUsers
};

