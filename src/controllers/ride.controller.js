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
  findAvailableDriversByProximity,
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
import { geocodeAddress, getDrivingDistance } from "../utils/googleMapsService.js";
import { getRiderWallet } from "../models/wallet.model.js";

/**
 * Internal helper to determine surge based on proximity demand/supply
 */
const determineSurge = async (lat, lng) => {
  try {
    const connection = await pool.getConnection();
    
    // 1. Online drivers within 10km
    const [[{ onlineDriversNearby }]] = await connection.execute(`
      SELECT COUNT(*) as onlineDriversNearby
      FROM driver d
      WHERE d.availability_status = 'Online'
        AND d.latitude IS NOT NULL
        AND (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
          COS(RADIANS(d.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
        )) <= 10
    `, [lat, lng, lat]);

    // 2. Active rides in last 30 min within 10km
    const [[{ activeRidesNearby }]] = await connection.execute(`
      SELECT COUNT(*) as activeRidesNearby
      FROM ride r
      WHERE r.status IN ('Requested', 'Accepted', 'In Progress')
        AND r.pickup_lat IS NOT NULL
        AND r.request_time >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(r.pickup_lat)) *
          COS(RADIANS(r.pickup_lng) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(r.pickup_lat))
        )) <= 10
    `, [lat, lng, lat]);

    connection.release();

    const ratio = onlineDriversNearby === 0 ? activeRidesNearby : activeRidesNearby / onlineDriversNearby;
    return ratio >= 2.0;
  } catch (err) {
    console.error("Surge calculation error:", err);
    return false;
  }
};

/**
 *  POST /api/v1/rides/request
 */
const requestNewRide = asyncHandler(async (req, res) => {
  const { pickup_location, dropoff_location, vehicle_type } = req.body;
  const riderId = req.user.userId;

  // 1. Check if rider already has an active ride
  const active = await hasActiveRide(riderId);
  if (active) throw new ApiError(400, "You already have an active ride");

  // 2. Geocode both addresses
  const pickupGeo = await geocodeAddress(pickup_location);
  if (!pickupGeo) throw new ApiError(400, `Could not locate pickup address: "${pickup_location}". Please be more specific.`);

  const dropoffGeo = await geocodeAddress(dropoff_location);
  if (!dropoffGeo) throw new ApiError(400, `Could not locate dropoff address: "${dropoff_location}". Please be more specific.`);

  // 3. Match drivers by proximity
  let drivers = await findAvailableDriversByProximity({
    lat: pickupGeo.lat,
    lng: pickupGeo.lng,
    vehicleType: vehicle_type
  });

  let driver = drivers[0];

  // Fallback to city match if no drivers nearby have coordinates
  if (!driver) {
    console.warn("No drivers found by proximity. Falling back to city matching.");
    driver = await findAvailableDriver(vehicle_type, pickupGeo.city);
  }

  if (!driver) {
    throw new ApiError(503, "No drivers available in your area currently.");
  }

  // 4. Calculate or Verify Estimated Fare
  let estimated_fare = req.body.estimated_fare;
  
  const mapsResult = await getDrivingDistance(
    pickupGeo.lat, pickupGeo.lng,
    dropoffGeo.lat, dropoffGeo.lng
  );
  const is_surge = await determineSurge(pickupGeo.lat, pickupGeo.lng);

  // Always re-calculate internally for deduction security
  const distance_km = mapsResult?.distanceKm || 0;
  const duration_minutes = mapsResult?.durationMinutes || 0;

  await pool.query('CALL CalculateFare(?, ?, ?, ?, @fare)', [
    distance_km,
    duration_minutes,
    vehicle_type,
    is_surge
  ]);
  const [[calcResult]] = await pool.query('SELECT @fare as fare');
  const internal_estimated_fare = calcResult.fare;

  // Use internal calculation if frontend didn't provide one or provided an invalid one
  if (!estimated_fare || estimated_fare <= 0) {
    estimated_fare = internal_estimated_fare;
  }

  // 5. Wallet Check (Pre-authorization)
  const wallet = await getRiderWallet(riderId);
  if (!wallet) throw new ApiError(400, "Wallet not found. Please contact support.");

  const balance = parseFloat(wallet.balance);
  if (balance < internal_estimated_fare) {
    throw new ApiError(402, "Insufficient wallet balance to book this ride.", {
      message: "Insufficient wallet balance to book this ride.",
      required: internal_estimated_fare,
      available: balance,
      shortfall: (internal_estimated_fare - balance).toFixed(2)
    });
  }

  // 6. Create Ride with full coordinates and estimates (Held status)
  const rideId = await createRide({
    rider_id: riderId,
    driver_id: driver.driver_id,
    vehicle_id: driver.vehicle_id,
    pickup_location: pickupGeo.formattedAddress,
    pickup_lat: pickupGeo.lat,
    pickup_lng: pickupGeo.lng,
    pickup_city: pickupGeo.city,
    dropoff_location: dropoffGeo.formattedAddress,
    dropoff_lat: dropoffGeo.lat,
    dropoff_lng: dropoffGeo.lng,
    dropoff_city: dropoffGeo.city,
    distance_km: distance_km,
    duration_minutes: duration_minutes,
    fare_estimated: internal_estimated_fare,
    wallet_hold_amount: internal_estimated_fare,
    payment_status: 'Held'
  });

  await updateAvailabilityStatus(driver.driver_id, 'On Trip');

  const rideDetails = await findRideById(rideId);
  return res.status(201).json(
    new ApiResponse(201, { 
      ...rideDetails, 
      is_surge,
      wallet_balance_before: balance,
      fare_estimated: internal_estimated_fare,
      wallet_after_ride: (balance - internal_estimated_fare).toFixed(2)
    }, "Ride matched and accepted")
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
  const driverId = req.user.userId;

  const ride = await findRideById(rideId);
  if (!ride || ride.driver_id !== driverId) {
    throw new ApiError(404, "Ride not found or not assigned to you");
  }

  if (ride.status !== 'In Progress') {
    throw new ApiError(400, "Trip must be in progress to complete");
  }

  // 1. Get real distance and duration from Google Maps
  let distance_km = 8.0; // defaults
  let duration_minutes = 15;
  let is_surge = await determineSurge(ride.pickup_lat, ride.pickup_lng);

  const mapsResult = await getDrivingDistance(
    ride.pickup_lat, ride.pickup_lng, 
    ride.dropoff_lat, ride.dropoff_lng
  );

  if (mapsResult) {
    distance_km = mapsResult.distanceKm;
    duration_minutes = mapsResult.durationMinutes;
  }

  // 2. Prepare completion
  await prepareRideCompletion(rideId, distance_km, duration_minutes);

  // 3. Calculate fare using stored procedure
  await pool.query('CALL CalculateFare(?, ?, ?, ?, @fare)', [
    distance_km,
    duration_minutes,
    ride.vehicle_type,
    is_surge
  ]);
  const [[result]] = await pool.query('SELECT @fare as fare');
  const fare = result.fare;

  await finalizeRide(rideId, fare);
  await updateAvailabilityStatus(driverId, 'Online');

  await createPayment({
    ride_id: rideId,
    rider_id: ride.rider_id,
    amount: fare,
    payment_method: 'Cash'
  });

  const summary = await findRideById(rideId);
  return res.status(200).json(new ApiResponse(200, summary, "Trip completed"));
});

/**
 * POST /api/v1/rides/estimate
 */
const handleGetFareEstimate = asyncHandler(async (req, res) => {
  const { pickup_location, dropoff_location, vehicle_type } = req.body;

  const pickupGeo = await geocodeAddress(pickup_location);
  const dropoffGeo = await geocodeAddress(dropoff_location);

  if (!pickupGeo || !dropoffGeo) {
    throw new ApiError(400, "Could not locate addresses for estimation");
  }

  const mapsResult = await getDrivingDistance(
    pickupGeo.lat, pickupGeo.lng,
    dropoffGeo.lat, dropoffGeo.lng
  );

  if (!mapsResult) {
    throw new ApiError(500, "Could not calculate distance for estimation");
  }

  const is_surge = await determineSurge(pickupGeo.lat, pickupGeo.lng);

  // Replicate CalculateFare logic briefly for estimate or call SP
  await pool.query('CALL CalculateFare(?, ?, ?, ?, @fare)', [
    mapsResult.distanceKm,
    mapsResult.durationMinutes,
    vehicle_type,
    is_surge
  ]);
  const [[result]] = await pool.query('SELECT @fare as fare');

  return res.status(200).json(new ApiResponse(200, {
    pickup: pickupGeo,
    dropoff: dropoffGeo,
    distance_km: mapsResult.distanceKm,
    duration_minutes: mapsResult.durationMinutes,
    duration_text: mapsResult.durationText,
    estimated_fare: result.fare,
    is_surge,
    vehicle_type
  }, "Estimate generated"));
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
  handleGetFareEstimate,
  fetchRiderHistory
};
