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
import { pool } from "../db/index.js";

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

const reportRevenueByCity = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT 
        r.pickup_city AS city,
        COUNT(p.payment_id) AS total_rides_paid,
        SUM(p.amount) AS total_revenue,
        SUM(p.discount_amount) AS total_discounts_given,
        SUM(p.amount + p.discount_amount) AS gross_fare_total,
        AVG(p.amount) AS avg_fare_per_ride
    FROM Payment p
    JOIN Ride r ON p.ride_id = r.ride_id
    WHERE p.payment_status = 'Paid'
  `;
  const params = [];
  if (from && to) {
    sql += " AND r.request_time BETWEEN ? AND ?";
    params.push(from, to);
  }
  sql += " GROUP BY r.pickup_city ORDER BY total_revenue DESC";
  
  const [data] = await pool.execute(sql, params);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportRevenueByMethod = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        payment_method,
        COUNT(*) AS transaction_count,
        SUM(amount) AS total_amount,
        AVG(amount) AS avg_amount,
        SUM(discount_amount) AS total_discounts
    FROM Payment
    WHERE payment_status = 'Paid'
    GROUP BY payment_method
    ORDER BY total_amount DESC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportDriverEarnings = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        u.full_name AS driver_name,
        u.email,
        d.total_trips,
        d.avg_rating,
        SUM(p.amount + p.discount_amount) AS total_fare_generated,
        SUM(wt.amount) AS total_earned,
        (SUM(p.amount + p.discount_amount) - SUM(wt.amount)) AS total_commission_paid,
        w.balance AS current_wallet_balance
    FROM Driver d
    JOIN User u ON d.driver_id = u.user_id
    JOIN Ride r ON r.driver_id = d.driver_id
    JOIN Payment p ON p.ride_id = r.ride_id AND p.payment_status = 'Paid'
    JOIN Wallet_Transaction wt ON wt.wallet_owner_id = d.driver_id 
        AND wt.owner_type = 'Driver' 
        AND wt.txn_type = 'Credit'
        AND wt.reference_id = r.ride_id
    JOIN Wallet w ON w.driver_id = d.driver_id
    GROUP BY d.driver_id, u.full_name, u.email, d.total_trips, d.avg_rating, w.balance
    ORDER BY total_earned DESC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportLowRatedDriversFull = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        u.full_name,
        u.email,
        u.phone,
        d.driver_id,
        d.total_trips,
        d.verification_status,
        AVG(rat.score) AS calculated_avg_rating,
        COUNT(rat.rating_id) AS total_ratings_received
    FROM Driver d
    JOIN User u ON d.driver_id = u.user_id
    LEFT JOIN Rating rat ON rat.rated_user_id = d.driver_id AND rat.rated_by = 'Rider'
    GROUP BY d.driver_id, u.full_name, u.email, u.phone, d.total_trips, d.verification_status
    HAVING AVG(rat.score) < 3.5 OR AVG(rat.score) IS NULL
    ORDER BY calculated_avg_rating ASC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportTripCountsFull = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        u.full_name AS driver_name,
        d.driver_id,
        d.current_city,
        d.avg_rating,
        COUNT(r.ride_id) AS completed_trips,
        SUM(r.fare) AS total_fare_generated,
        d.total_trips AS stored_trip_count
    FROM Driver d
    JOIN User u ON d.driver_id = u.user_id
    LEFT JOIN Ride r ON r.driver_id = d.driver_id AND r.status = 'Completed'
    GROUP BY d.driver_id, u.full_name, d.current_city, d.avg_rating, d.total_trips
    ORDER BY completed_trips DESC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportAllRiders = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        u.full_name AS rider_name,
        u.email,
        u.phone,
        u.account_status,
        u.registration_date,
        COUNT(r.ride_id) AS total_rides,
        COUNT(CASE WHEN r.status = 'Completed' THEN 1 END) AS completed_rides,
        COUNT(CASE WHEN r.status = 'Cancelled' THEN 1 END) AS cancelled_rides,
        COALESCE(SUM(p.amount), 0) AS total_spent,
        rw.balance AS wallet_balance
    FROM User u
    LEFT JOIN Ride r ON r.rider_id = u.user_id
    LEFT JOIN Payment p ON p.ride_id = r.ride_id AND p.payment_status = 'Paid'
    LEFT JOIN Rider_Wallet rw ON rw.rider_id = u.user_id
    WHERE u.role = 'Rider'
    GROUP BY u.user_id, u.full_name, u.email, u.phone, u.account_status, u.registration_date, rw.balance
    ORDER BY total_rides DESC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
});

const reportPromoUsage = asyncHandler(async (req, res) => {
  const [data] = await pool.execute(`
    SELECT 
        pc.code,
        pc.discount_type,
        pc.discount_value,
        pc.min_ride_amount,
        pc.expiry_date,
        pc.is_active,
        pc.usage_count,
        pc.max_usage,
        COALESCE(SUM(p.discount_amount), 0) AS total_discount_given,
        COUNT(p.payment_id) AS times_used_in_payments
    FROM Promo_Code pc
    LEFT JOIN Payment p ON p.promo_code = pc.code AND p.payment_status = 'Paid'
    GROUP BY pc.code, pc.discount_type, pc.discount_value, pc.min_ride_amount, 
             pc.expiry_date, pc.is_active, pc.usage_count, pc.max_usage
    ORDER BY pc.usage_count DESC
  `);
  return res.status(200).json(new ApiResponse(200, data, "Report fetched"));
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
  reportPromoUsage
};
