import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as ratingModel from '../models/rating.model.js';
import * as rideService from '../services/rideService.js'; // Assuming it exists or I'll use pool directly
import { pool } from '../db/index.js';

/**
 * Submits a rating for a ride.
 */
export const submitRating = asyncHandler(async (req, res) => {
  const { ride_id, score, comment } = req.body;
  const userId = req.user.userId;

  // 1. Fetch ride
  const [rides] = await pool.query('SELECT * FROM ride WHERE ride_id = ?', [ride_id]);
  const ride = rides[0];

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // 2. Validate status
  if (ride.status !== 'Completed') {
    throw new ApiError(400, "You can only rate a completed ride");
  }

  // 3. Determine role and target
  let ratedBy, ratedUserId, alreadyRated;

  if (req.user.role === 'Rider') {
    if (userId !== ride.rider_id) throw new ApiError(403, "This is not your ride");
    
    // Check payment gate
    if (ride.payment_status !== 'Paid') {
      throw new ApiError(400, "Please complete payment before rating");
    }

    ratedBy = 'Rider';
    ratedUserId = ride.driver_id;
    alreadyRated = ride.rider_has_rated;
  } else if (req.user.role === 'Driver') {
    if (userId !== ride.driver_id) throw new ApiError(403, "This is not your ride");
    
    ratedBy = 'Driver';
    ratedUserId = ride.rider_id;
    alreadyRated = ride.driver_has_rated;
  } else {
    throw new ApiError(403, "Only Riders and Drivers can submit ratings");
  }

  // 4. Check if already rated
  if (alreadyRated) {
    throw new ApiError(400, `You have already rated this ride as a ${req.user.role}`);
  }

  // 5. Validate score
  const numericScore = parseInt(score);
  if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
    throw new ApiError(400, "Score must be an integer between 1 and 5");
  }

  // 6. Create rating
  const ratingId = await ratingModel.createRating({
    ride_id,
    rated_by: ratedBy,
    rated_user_id: ratedUserId,
    score: numericScore,
    comment: comment || ''
  });

  // 7. Update ride flag
  await ratingModel.updateRideRatingFlag(ride_id, req.user.role.toLowerCase());

  return res.status(201).json(
    new ApiResponse(201, {
      rating_id: ratingId,
      ride_id,
      score: numericScore,
      comment,
      rated_user_id: ratedUserId,
      rated_by: ratedBy,
      message: `${req.user.role === 'Rider' ? 'Driver' : 'Rider'} rated successfully`
    })
  );
});

/**
 * Gets ratings received by the logged-in user.
 */
export const getMyRatings = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const role = req.user.role;

  // If I am a Driver, I want ratings given BY Riders
  // If I am a Rider, I want ratings given BY Drivers
  const targetRatedBy = (role === 'Driver') ? 'Rider' : 'Driver';

  const ratings = await ratingModel.getRatingsForUser(userId, targetRatedBy);
  
  let summary = null;
  if (role === 'Driver') {
    summary = await ratingModel.getDriverAverageRating(userId);
  }

  return res.status(200).json(
    new ApiResponse(200, {
      ratings,
      summary
    })
  );
});

/**
 * Checks if the current user has rated a specific ride.
 */
export const getRideRatingStatus = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const userId = req.user.userId;
  const role = req.user.role;

  const [rows] = await pool.query('SELECT * FROM ride WHERE ride_id = ?', [rideId]);
  const ride = rows[0];

  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  let hasRated, canRate;
  if (role === 'Rider') {
    hasRated = !!ride.rider_has_rated;
    canRate = ride.status === 'Completed' && ride.payment_status === 'Paid' && !hasRated;
  } else {
    hasRated = !!ride.driver_has_rated;
    canRate = ride.status === 'Completed' && !hasRated;
  }

  return res.status(200).json(
    new ApiResponse(200, {
      can_rate: canRate,
      has_rated: hasRated,
      ride_status: ride.status,
      payment_status: ride.payment_status
    })
  );
});
