/**
 * @file src/models/payment.model.js
 */
import { pool } from "../db/index.js";

const findPaymentByRideId = async (rideId) => {
  const [rows] = await pool.execute("SELECT * FROM payment WHERE ride_id = ?", [rideId]);
  return rows[0];
};

const createPaymentRecord = async (connection, paymentData) => {
  const { ride_id, rider_id, amount, method, status, promo_code, discount_amount } = paymentData;
  const [result] = await connection.execute(
    `INSERT INTO payment (
      ride_id, rider_id, amount, payment_method, 
      payment_status, promo_code, discount_amount, transaction_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [ride_id, rider_id, amount, method, status, promo_code || null, discount_amount || 0]
  );
  return result.insertId;
};

const updatePaymentRecord = async (connection, paymentData) => {
  const { payment_id, status, promo_code, discount_amount, amount, method } = paymentData;
  await connection.execute(
    `UPDATE Payment 
     SET payment_status = ?, promo_code = ?, discount_amount = ?, amount = ?, payment_method = ?, transaction_date = NOW()
     WHERE payment_id = ?`,
    [status, promo_code || null, discount_amount || 0, amount, method, payment_id]
  );
};

const getRiderPaymentHistory = async (riderId) => {
  const [rows] = await pool.execute(
    `SELECT p.*, r.pickup_location, r.dropoff_location, r.fare as original_fare
     FROM Payment p
     JOIN Ride r ON p.ride_id = r.ride_id
     WHERE p.rider_id = ?
     ORDER BY p.transaction_date DESC`,
    [riderId]
  );
  return rows;
};

const getPaymentDetail = async (paymentId) => {
  const [rows] = await pool.execute(
    `SELECT p.*, r.pickup_location, r.dropoff_location, r.pickup_city, r.dropoff_city,
            u.full_name as driver_name, v.make, v.model, v.license_plate
     FROM Payment p
     JOIN Ride r ON p.ride_id = r.ride_id
     JOIN Driver d ON r.driver_id = d.driver_id
     JOIN User u ON d.driver_id = u.user_id
     JOIN Vehicle v ON r.vehicle_id = v.vehicle_id
     WHERE p.payment_id = ?`,
    [paymentId]
  );
  return rows[0];
};

const getAllPaymentsAdmin = async (filters = {}) => {
  let sql = `
    SELECT p.*, r.pickup_city, u_rider.full_name as rider_name, u_driver.full_name as driver_name
    FROM Payment p
    JOIN Ride r ON p.ride_id = r.ride_id
    JOIN User u_rider ON p.rider_id = u_rider.user_id
    JOIN User u_driver ON r.driver_id = u_driver.user_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.method) {
    sql += " AND p.payment_method = ?";
    params.push(filters.method);
  }
  if (filters.status) {
    sql += " AND p.payment_status = ?";
    params.push(filters.status);
  }
  if (filters.from && filters.to) {
    sql += " AND p.transaction_date BETWEEN ? AND ?";
    params.push(filters.from, filters.to);
  }

  sql += " ORDER BY p.transaction_date DESC";
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export {
  findPaymentByRideId,
  createPaymentRecord,
  updatePaymentRecord,
  getRiderPaymentHistory,
  getPaymentDetail,
  getAllPaymentsAdmin
};
