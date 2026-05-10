import { pool } from '../db/index.js';

/**
 * Finds a rating for a specific ride and side (Rider/Driver).
 */
export const findRatingByRideAndSide = async (rideId, ratedBy) => {
  const [rows] = await pool.query(
    'SELECT * FROM rating WHERE ride_id = ? AND rated_by = ?',
    [rideId, ratedBy]
  );
  return rows[0];
};

/**
 * Creates a new rating record.
 */
export const createRating = async (ratingData) => {
  const { ride_id, rated_by, rated_user_id, score, comment } = ratingData;
  const [result] = await pool.query(
    `INSERT INTO rating (ride_id, rated_by, rated_user_id, score, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [ride_id, rated_by, rated_user_id, score, comment]
  );
  return result.insertId;
};

/**
 * Gets all ratings received by a user.
 */
export const getRatingsForUser = async (userId, ratedBy) => {
  const [rows] = await pool.query(
    `SELECT r.*, rd.pickup_location, rd.dropoff_location, rd.end_time,
            u.full_name AS rated_by_name
     FROM rating r
     JOIN ride rd ON r.ride_id = rd.ride_id
     JOIN user u ON (
       (r.rated_by = 'Rider' AND rd.rider_id = u.user_id)
       OR 
       (r.rated_by = 'Driver' AND rd.driver_id = u.user_id)
     )
     WHERE r.rated_user_id = ?
     AND r.rated_by = ?
     ORDER BY r.timestamp DESC`,
    [userId, ratedBy]
  );
  return rows;
};

/**
 * Calculates average rating and star distribution for a driver.
 */
export const getDriverAverageRating = async (driverId) => {
  const [rows] = await pool.query(
    `SELECT 
      AVG(score) AS avg_rating,
      COUNT(*) AS total_ratings,
      SUM(CASE WHEN score = 5 THEN 1 ELSE 0 END) AS five_star,
      SUM(CASE WHEN score = 4 THEN 1 ELSE 0 END) AS four_star,
      SUM(CASE WHEN score = 3 THEN 1 ELSE 0 END) AS three_star,
      SUM(CASE WHEN score = 2 THEN 1 ELSE 0 END) AS two_star,
      SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END) AS one_star
    FROM rating
    WHERE rated_user_id = ? AND rated_by = 'Rider'`,
    [driverId]
  );
  return rows[0];
};

/**
 * Updates the 'has_rated' flag on a ride.
 */
export const updateRideRatingFlag = async (rideId, side) => {
  const column = side === 'rider' ? 'rider_has_rated' : 'driver_has_rated';
  await pool.query(
    `UPDATE ride SET ${column} = TRUE WHERE ride_id = ?`,
    [rideId]
  );
};
