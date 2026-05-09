/**
 * @file src/controllers/ride.controller.js
 */
import { pool } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  hasActiveRide,
  findAvailableDriver,
  createRide,
  findActiveRideForRider,
  findActiveRideForDriver,
  findRideById,
  startRide,
  prepareRideCompletion,
  finalizeRide,
  cancelRide,
  getRiderHistory,
  createPayment
} from "../models/ride.model.js";
import { updateAvailabilityStatus } from "../models/driver.model.js";

/**
 *  POST /api/v1/rides/request
 */
const requestNewRide = asyncHandler(async (req, res) => {
  const { pickup_location, pickup_city, dropoff_location, dropoff_city, vehicle_type } = req.body;
  const riderId = req.user.userId;

  // 1. Check if rider already has an active ride
  const active = await hasActiveRide(riderId);
  if (active) {
    throw new ApiError(400, "You already have an active ride");
  }

  // 2. Match driver
  const driver = await findAvailableDriver(vehicle_type, pickup_city);
  if (!driver) {
    throw new ApiError(503, "No drivers available in your area currently. Please try again shortly.");
  }

  // 3. Create Ride
  const rideId = await createRide({
    rider_id: riderId,
    driver_id: driver.driver_id,
    vehicle_id: driver.vehicle_id,
    pickup_location,
    pickup_city,
    dropoff_location,
    dropoff_city
  });

  // 4. Update Driver status
  await updateAvailabilityStatus(driver.driver_id, 'On Trip');

  const rideDetails = await findRideById(rideId);

  return res.status(201).json(
    new ApiResponse(201, rideDetails, "Ride matched and accepted by driver")
  );
});

/**
 * GET /api/v1/rides/active
 */
const getActiveRide = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  let ride;

  if (role === 'Rider') {
    ride = await findActiveRideForRider(userId);
  } else if (role === 'Driver') {
    ride = await findActiveRideForDriver(userId);
  }

  if (!ride) {
    return res.status(200).json(new ApiResponse(200, null, "No active ride found"));
  }

  return res.status(200).json(new ApiResponse(200, ride, "Active ride fetched successfully"));
});

/**
 * PATCH /api/v1/rides/:rideId/start
 */
const handleStartRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const driverId = req.user.userId;

  const ride = await findRideById(rideId);
  if (!ride || ride.driver_id !== driverId) {
    throw new ApiError(404, "Ride not found or not assigned to you");
  }

  if (ride.status !== 'Accepted') {
    throw new ApiError(400, `Cannot start ride with status: ${ride.status}`);
  }

  await startRide(rideId);

  return res.status(200).json(new ApiResponse(200, { status: 'In Progress' }, "Trip started"));
});

/**
 * PATCH /api/v1/rides/:rideId/complete
 */
const handleCompleteRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { distance_km, duration_minutes, is_surge = false } = req.body;
  const driverId = req.user.userId;

  const ride = await findRideById(rideId);
  if (!ride || ride.driver_id !== driverId) {
    throw new ApiError(404, "Ride not found or not assigned to you");
  }

  if (ride.status !== 'In Progress') {
    throw new ApiError(400, "Trip must be in progress to complete");
  }

  // 1. Prepare completion (sets end_time, distance, duration)
  await prepareRideCompletion(rideId, distance_km, duration_minutes);

  // 2. Call stored procedure for fare calculation
  // Using session variable pattern for OUT parameter
  await pool.query('CALL CalculateFare(?, ?, ?, ?, @fare)', [
    distance_km,
    duration_minutes,
    ride.vehicle_type,
    is_surge
  ]);
  const [[result]] = await pool.query('SELECT @fare as fare');
  const fare = result.fare;

  // 3. Finalize ride status and fare
  await finalizeRide(rideId, fare);

  // 4. Free up driver
  await updateAvailabilityStatus(driverId, 'Online');

  // 5. Create pending payment record
  await createPayment({
    ride_id: rideId,
    rider_id: ride.rider_id,
    amount: fare,
    payment_method: 'Cash'
  });

  const summary = await findRideById(rideId);

  return res.status(200).json(new ApiResponse(200, summary, "Trip completed successfully"));
});

/**
 * PATCH /api/v1/rides/:rideId/cancel
 */
const handleCancelRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { userId, role } = req.user;

  const ride = await findRideById(rideId);
  if (!ride) throw new ApiError(404, "Ride not found");

  // Auth check
  if (role === 'Rider' && ride.rider_id !== userId) throw new ApiError(403, "Not your ride");
  if (role === 'Driver' && ride.driver_id !== userId) throw new ApiError(403, "Not assigned to you");

  if (ride.status === 'In Progress' || ride.status === 'Completed' || ride.status === 'Cancelled') {
    throw new ApiError(400, `Cannot cancel ride with status: ${ride.status}`);
  }

  await cancelRide(rideId);

  // If driver was assigned, free them
  if (ride.driver_id) {
    await updateAvailabilityStatus(ride.driver_id, 'Online');
  }

  return res.status(200).json(new ApiResponse(200, { status: 'Cancelled' }, "Ride cancelled"));
});

/**
 * GET /api/v1/rides/history
 */
const fetchRiderHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const history = await getRiderHistory(req.user.userId, parseInt(page), parseInt(limit));
  return res.status(200).json(new ApiResponse(200, history, "Ride history fetched"));
});

export {
  requestNewRide,
  getActiveRide,
  handleStartRide,
  handleCompleteRide,
  handleCancelRide,
  fetchRiderHistory
};
