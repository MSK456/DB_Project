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

/**
 * HELPERS: Parse date range
 */
const getDateRange = (req) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const from = req.query.from || thirtyDaysAgo.toISOString().split('T')[0];
  const to = req.query.to || new Date().toISOString().split('T')[0];
  
  return [from, to];
};

/**
 * GET /api/v1/admin/reports/revenue/by-city
 */
const getRevenueByCity = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT pickup_city as city, SUM(fare) as revenue, COUNT(*) as ride_count 
     FROM Ride WHERE status = 'Completed' AND request_time BETWEEN ? AND ? 
     GROUP BY pickup_city`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Revenue by city fetched"));
});

/**
 * GET /api/v1/admin/reports/revenue/by-method
 */
const getRevenueByMethod = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT payment_method, SUM(amount) as revenue, COUNT(*) as count 
     FROM Payment WHERE payment_status = 'Paid' AND transaction_date BETWEEN ? AND ? 
     GROUP BY payment_method`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Revenue by method fetched"));
});

/**
 * GET /api/v1/admin/reports/drivers/earnings
 */
const getDriverEarningsReport = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT u.full_name, SUM(p.amount * 0.8) as earnings 
     FROM Payment p 
     JOIN Ride r ON p.ride_id = r.ride_id 
     JOIN User u ON r.driver_id = u.user_id 
     WHERE p.payment_status = 'Paid' AND p.transaction_date BETWEEN ? AND ? 
     GROUP BY u.user_id ORDER BY earnings DESC`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Driver earnings fetched"));
});

/**
 * GET /api/v1/admin/reports/drivers/low-rated
 */
const getLowRatedDriversReport = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.full_name, d.avg_rating, d.total_rides 
     FROM Driver d JOIN User u ON d.driver_id = u.user_id 
     WHERE d.avg_rating < 3.0 AND d.total_rides > 5 
     ORDER BY d.avg_rating ASC`
  );
  return res.status(200).json(new ApiResponse(200, rows, "Low rated drivers fetched"));
});

/**
 * GET /api/v1/admin/reports/drivers/trip-count
 */
const getTripCountReport = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT u.full_name, COUNT(r.ride_id) as trip_count 
     FROM Ride r JOIN User u ON r.driver_id = u.user_id 
     WHERE r.status = 'Completed' AND r.request_time BETWEEN ? AND ? 
     GROUP BY u.user_id ORDER BY trip_count DESC`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Trip count report fetched"));
});

/**
 * GET /api/v1/admin/reports/promos/usage
 */
const getPromoUsageReport = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT promo_code, COUNT(*) as usage_count, SUM(discount_amount) as total_savings 
     FROM Payment WHERE promo_code IS NOT NULL AND transaction_date BETWEEN ? AND ? 
     GROUP BY promo_code ORDER BY usage_count DESC`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Promo usage report fetched"));
});

/**
 * GET /api/v1/admin/reports/revenue/by-day
 */
const getRevenueByDay = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT 
      DATE(p.transaction_date) AS date,
      COUNT(*) AS rides_paid,
      SUM(p.amount) AS revenue,
      SUM(p.discount_amount) AS discounts
    FROM Payment p
    WHERE p.payment_status = 'Paid'
      AND p.transaction_date BETWEEN ? AND ?
    GROUP BY DATE(p.transaction_date)
    ORDER BY date ASC`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Revenue by day fetched"));
});

/**
 * GET /api/v1/admin/reports/trips/full
 */
const getFullTripReport = asyncHandler(async (req, res) => {
  const [from, to] = getDateRange(req);
  const [rows] = await pool.execute(
    `SELECT
      r.ride_id,
      r.status,
      r.request_time,
      r.start_time,
      r.end_time,
      r.actual_distance_km,
      r.actual_duration_minutes,
      r.fare AS final_fare,
      r.pickup_location,
      r.dropoff_location,
      r.pickup_city,
      ru.full_name AS rider_name,
      ru.email AS rider_email,
      du.full_name AS driver_name,
      d.avg_rating AS driver_rating,
      v.make, v.model, v.license_plate, v.vehicle_type,
      p.amount AS amount_paid,
      p.payment_method,
      p.promo_code
    FROM Ride r
    INNER JOIN User ru ON r.rider_id = ru.user_id
    INNER JOIN Driver d ON r.driver_id = d.driver_id
    INNER JOIN User du ON d.driver_id = du.user_id
    INNER JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
    LEFT JOIN Payment p ON p.ride_id = r.ride_id
    WHERE r.request_time BETWEEN ? AND ?
    ORDER BY r.request_time DESC
    LIMIT 500`,
    [from + " 00:00:00", to + " 23:59:59"]
  );
  return res.status(200).json(new ApiResponse(200, rows, "Full trip report fetched"));
});

export {
  updateUserStatus,
  getSystemOverview,
  updateFareConfig,
  getFareConfigs,
  getUsers,
  getRevenueByCity,
  getRevenueByMethod,
  getDriverEarningsReport,
  getLowRatedDriversReport,
  getTripCountReport,
  getPromoUsageReport,
  getRevenueByDay,
  getFullTripReport
};


