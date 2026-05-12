/**
 * @file src/controllers/payment.controller.js
 */
import { pool } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validatePromoLogic } from "../utils/promoUtils.js";
import { findRideById } from "../models/ride.model.js";
import { findPaymentByRideId, createPaymentRecord, updatePaymentRecord, getRiderPaymentHistory, getPaymentDetail, getAllPaymentsAdmin } from "../models/payment.model.js";
import { findPromoByCode } from "../models/promo.model.js";
import { getRiderWallet, updateRiderBalance, updateDriverBalance, recordTransaction, getDriverWallet } from "../models/wallet.model.js";

/**
 * POST /api/v1/payments/pay
 */
const handlePayForRide = asyncHandler(async (req, res) => {
  const { ride_id, payment_method, promo_code } = req.body;
  const riderId = req.user.userId;

  // Step 1: Validate Ride & Payment Record
  const ride = await findRideById(ride_id);
  if (!ride || ride.rider_id !== riderId) {
    throw new ApiError(404, "Ride not found");
  }
  if (ride.status !== 'Completed') {
    throw new ApiError(400, "Can only pay for completed rides");
  }

  const payment = await findPaymentByRideId(ride_id);
  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }
  if (payment.payment_status === 'Paid') {
    throw new ApiError(400, "Payment already processed");
  }

  // Step 2: Promo Code Validation
  let discountAmount = 0;
  let finalAmount = parseFloat(ride.fare);
  let promo = null;

  if (promo_code) {
    promo = await findPromoByCode(promo_code);
    const result = validatePromoLogic(promo, ride.fare);
    discountAmount = result.discountAmount;
    finalAmount = result.finalAmount;
  }

  // Step 3: Payment Method Validation
  if (payment_method === 'Wallet') {
    const wallet = await getRiderWallet(riderId);
    if (!wallet || wallet.balance < finalAmount) {
      throw new ApiError(402, "Insufficient wallet balance. Please top up or choose another payment method.");
    }
  }

  // Step 4: START TRANSACTION
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 4a: Update Payment Record
    await updatePaymentRecord(connection, {
      payment_id: payment.payment_id,
      status: 'Paid',
      promo_code: promo_code,
      discount_amount: discountAmount,
      amount: finalAmount,
      method: payment_method
    });

    // 4b: If Wallet, debit rider
    if (payment_method === 'Wallet') {
      await updateRiderBalance(connection, riderId, -finalAmount);
      const [rRows] = await connection.execute("SELECT balance FROM rider_wallet WHERE rider_id = ?", [riderId]);
      const newRiderBalance = rRows[0].balance;

      await recordTransaction(connection, {
        owner_id: riderId,
        owner_type: 'Rider',
        txn_type: 'TripPayment',
        amount: finalAmount,
        balance_after: newRiderBalance,
        ref_id: ride_id,
        ref_type: 'Ride',
        note: `Payment for ride #${ride_id}`
      });
    }

    // 4c: Calculate Driver Earnings (based on original fare)
    const [config] = await connection.execute("SELECT commission_rate FROM fare_config WHERE vehicle_type = ?", [ride.vehicle_type]);
    const commissionRate = config[0]?.commission_rate || 0.20;
    const driverEarning = ride.fare * (1 - commissionRate);
    const commissionDeducted = ride.fare * commissionRate;

    // 4d: Credit Driver Wallet
    await updateDriverBalance(connection, ride.driver_id, driverEarning);
    const [dRows] = await connection.execute("SELECT balance FROM wallet WHERE driver_id = ?", [ride.driver_id]);
    const newDriverBalance = dRows[0].balance;

    await recordTransaction(connection, {
      owner_id: ride.driver_id,
      owner_type: 'Driver',
      txn_type: 'TripEarning',
      amount: driverEarning,
      balance_after: newDriverBalance,
      ref_id: ride_id,
      ref_type: 'Ride',
      note: `Earnings for ride #${ride_id}`
    });

    await connection.commit();

    const summary = {
      payment_id: payment.payment_id,
      ride_id,
      original_fare: ride.fare,
      discount_applied: discountAmount,
      final_amount_paid: finalAmount,
      payment_method,
      payment_status: 'Paid',
      driver_earning: driverEarning,
      commission_deducted: commissionDeducted,
      promo_code_used: promo_code || null,
      transaction_date: new Date()
    };

    return res.status(200).json(new ApiResponse(200, summary, "Payment successful"));

  } catch (error) {
    await connection.rollback();
    console.error("Payment Transaction Error:", error);
    throw new ApiError(500, "Payment processing failed. No charges were made.");
  } finally {
    connection.release();
  }
});

/**
 * GET /api/v1/payments/my
 */
const fetchMyPayments = asyncHandler(async (req, res) => {
  const history = await getRiderPaymentHistory(req.user.userId);
  return res.status(200).json(new ApiResponse(200, history, "Payment history fetched"));
});

/**
 * GET /api/v1/payments/:paymentId
 */
const fetchPaymentDetail = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await getPaymentDetail(paymentId);

  if (!payment) throw new ApiError(404, "Payment not found");
  
  // Auth check: Rider can only see their own; Admin can see any
  if (req.user.role === 'Rider' && payment.rider_id !== req.user.userId) {
    throw new ApiError(403, "Access denied");
  }

  return res.status(200).json(new ApiResponse(200, payment, "Payment details fetched"));
});

/**
 * GET /api/v1/admin/payments
 */
const fetchAllPaymentsAdmin = asyncHandler(async (req, res) => {
  const payments = await getAllPaymentsAdmin(req.query);
  return res.status(200).json(new ApiResponse(200, payments, "All payments fetched"));
});

/**
 * POST /api/v1/payments/process-ride/:rideId
 * Triggered by rider to finalize a completed ride payment via wallet.
 */
const handleProcessRidePayment = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { promo_code } = req.body;
  const riderId = req.user.userId;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Step 0: Idempotency check
    const [existingPayments] = await connection.execute(
      "SELECT payment_id FROM payment WHERE ride_id = ? AND payment_status = 'Paid'",
      [rideId]
    );
    if (existingPayments.length > 0) {
      await connection.rollback();
      return res.status(200).json(new ApiResponse(200, { 
        payment_id: existingPayments[0].payment_id, 
        ride_id: rideId, 
        payment_status: 'Paid' 
      }, "Payment already processed."));
    }

    // Step 1: Fetch ride with lock (join vehicle for vehicle_type)
    const [rideRows] = await connection.execute(
      `SELECT r.*, v.vehicle_type 
       FROM ride r 
       JOIN vehicle v ON r.vehicle_id = v.vehicle_id 
       WHERE r.ride_id = ? AND r.rider_id = ? FOR UPDATE`,
      [rideId, riderId]
    );
    const ride = rideRows[0];

    if (!ride) throw new ApiError(404, "Ride not found");
    if (ride.status !== 'Completed') throw new ApiError(400, "Ride is not completed yet");
    if (ride.payment_status === 'Paid') throw new ApiError(400, "This ride has already been paid");
    if (ride.payment_status === 'Released') throw new ApiError(400, "Payment was released (ride was cancelled)");

    // Step 2: Promo Calculation
    let discountAmount = 0;
    let finalAmount = parseFloat(ride.fare) || 0;
    let promo = null;

    if (promo_code) {
      promo = await findPromoByCode(promo_code);
      const promoResult = validatePromoLogic(promo, ride.fare);
      discountAmount = promoResult.discountAmount;
      finalAmount = promoResult.finalAmount;
    }

    // Step 3: Rider Wallet Check
    const [walletRows] = await connection.execute(
      "SELECT balance FROM rider_wallet WHERE rider_id = ? FOR UPDATE",
      [riderId]
    );
    const wallet = walletRows[0];
    const balance = parseFloat(wallet?.balance || 0);
    let fareVal = parseFloat(ride.fare);
    if (isNaN(fareVal)) fareVal = 0;

    if (balance < finalAmount) {
      await connection.rollback();
      return res.status(402).json(new ApiResponse(402, {
        required: finalAmount,
        available: balance,
        shortfall: (finalAmount - balance).toFixed(2)
      }, "Insufficient wallet balance"));
    }

    // Step 4: Deduct Rider Wallet
    const newRiderBalance = balance - finalAmount;
    await connection.execute(
      "UPDATE rider_wallet SET balance = ? WHERE rider_id = ?",
      [newRiderBalance || 0, riderId]
    );

    await connection.execute(
      `INSERT INTO wallet_transaction 
       (wallet_owner_id, owner_type, txn_type, amount, balance_after, reference_id, reference_type, note)
       VALUES (?, 'Rider', 'TripPayment', ?, ?, ?, 'Ride', ?)`,
      [riderId, finalAmount || 0, newRiderBalance || 0, rideId, `Payment for ride #${rideId}`]
    );

    // Step 5: Driver Earnings
    const [configRows] = await connection.execute(
      "SELECT commission_rate FROM fare_config WHERE vehicle_type = ?",
      [ride.vehicle_type]
    );
    const commissionRate = configRows[0]?.commission_rate || 0.20;
    const currentFare = parseFloat(ride.fare) || 0;
    const driverEarning = currentFare * (1 - commissionRate);
    const commissionDeducted = currentFare * commissionRate;

    // Step 6: Credit Driver Wallet
    const [dWalletRows] = await connection.execute(
      "SELECT balance FROM wallet WHERE driver_id = ? FOR UPDATE",
      [ride.driver_id]
    );
    const dWallet = dWalletRows[0];
    const newDriverBalance = parseFloat(dWallet.balance) + driverEarning;

    await connection.execute(
      "UPDATE wallet SET balance = ? WHERE driver_id = ?",
      [newDriverBalance || 0, ride.driver_id]
    );

    await connection.execute(
      `INSERT INTO wallet_transaction 
       (wallet_owner_id, owner_type, txn_type, amount, balance_after, reference_id, reference_type, note)
       VALUES (?, 'Driver', 'TripEarning', ?, ?, ?, 'Ride', ?)`,
      [ride.driver_id, driverEarning || 0, newDriverBalance || 0, rideId, `Earnings for ride #${rideId}`]
    );

    // Step 7: Create Payment Record
    const paymentId = await createPaymentRecord(connection, {
      ride_id: rideId,
      rider_id: riderId,
      amount: finalAmount,
      method: 'Wallet',
      status: 'Paid',
      promo_code,
      discount_amount: discountAmount
    });

    // Step 8: Update Ride status
    await connection.execute(
      "UPDATE ride SET payment_status = 'Paid' WHERE ride_id = ?",
      [rideId]
    );

    await connection.commit();

    return res.status(200).json(new ApiResponse(200, {
      payment_id: paymentId,
      ride_id: rideId,
      original_fare: ride.fare,
      discount_applied: discountAmount,
      final_amount_paid: finalAmount,
      driver_earned: driverEarning,
      commission_deducted: commissionDeducted,
      rider_wallet_balance_after: newRiderBalance,
      payment_status: 'Paid'
    }, "Payment successful. Thank you for riding with RideFlow!"));

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Payment Processing Error:", error);
    throw new ApiError(error.statusCode || 500, error.message || "Payment failed. No charges were made.");
  } finally {
    if (connection) connection.release();
  }
});

export { 
  handlePayForRide, 
  fetchMyPayments, 
  fetchPaymentDetail, 
  fetchAllPaymentsAdmin,
  handleProcessRidePayment 
};
