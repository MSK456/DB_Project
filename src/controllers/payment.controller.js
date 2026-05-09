/**
 * @file src/controllers/payment.controller.js
 */
import { pool } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validatePromoLogic } from "../utils/promoUtils.js";
import { findRideById } from "../models/ride.model.js";
import { findPaymentByRideId, updatePaymentRecord, getRiderPaymentHistory, getPaymentDetail, getAllPaymentsAdmin } from "../models/payment.model.js";
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
      const [rRows] = await connection.execute("SELECT balance FROM Rider_Wallet WHERE rider_id = ?", [riderId]);
      const newRiderBalance = rRows[0].balance;

      await recordTransaction(connection, {
        owner_id: riderId,
        owner_type: 'Rider',
        txn_type: 'Debit',
        amount: finalAmount,
        balance_after: newRiderBalance,
        ref_id: ride_id,
        ref_type: 'Ride',
        note: `Payment for ride #${ride_id}`
      });
    }

    // 4c: Calculate Driver Earnings (based on original fare)
    const [config] = await connection.execute("SELECT commission_rate FROM Fare_Config WHERE vehicle_type = ?", [ride.vehicle_type]);
    const commissionRate = config[0]?.commission_rate || 0.20;
    const driverEarning = ride.fare * (1 - commissionRate);
    const commissionDeducted = ride.fare * commissionRate;

    // 4d: Credit Driver Wallet
    await updateDriverBalance(connection, ride.driver_id, driverEarning);
    const [dRows] = await connection.execute("SELECT balance FROM Wallet WHERE driver_id = ?", [ride.driver_id]);
    const newDriverBalance = dRows[0].balance;

    await recordTransaction(connection, {
      owner_id: ride.driver_id,
      owner_type: 'Driver',
      txn_type: 'Credit',
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

export { handlePayForRide, fetchMyPayments, fetchPaymentDetail, fetchAllPaymentsAdmin };
