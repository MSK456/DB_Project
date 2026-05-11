/**
 * @file src/controllers/wallet.controller.js
 */
import { pool } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getRiderWallet,
  getDriverWallet,
  updateRiderBalance,
  updateDriverBalance,
  recordTransaction,
  getWalletHistory,
  getPayoutById,
  getAllPayouts,
  updatePayoutStatus,
  getDriverPayouts
} from "../models/wallet.model.js";

/**
 * GET /api/v1/wallet/balance
 */
const getBalance = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  let balance = 0;

  if (role === 'Rider') {
    const wallet = await getRiderWallet(userId);
    if (!wallet) {
      balance = 0;
    } else {
      balance = wallet.balance;
    }
  } else if (role === 'Driver') {
    const wallet = await getDriverWallet(userId);
    if (!wallet) {
      balance = 0;
    } else {
      balance = wallet.balance;
    }
  }

  return res.status(200).json(new ApiResponse(200, { balance }, "Balance fetched"));
});

/**
 * POST /api/v1/wallet/topup
 */
const handleTopup = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const riderId = req.user.userId;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 0. Daily Limit Check
    const [dailySum] = await connection.execute(
      `SELECT SUM(amount) as total FROM wallet_transaction 
       WHERE wallet_owner_id = ? AND txn_type = 'TopUp' 
       AND DATE(created_at) = CURDATE()`,
      [riderId]
    );
    const currentTotal = parseFloat(dailySum[0].total || 0);
    if (currentTotal + parseFloat(amount) > 100000) {
      throw new ApiError(400, "Daily top-up limit of PKR 100,000 reached");
    }

    // Check if wallet exists, if not, create it
    const [existing] = await connection.execute("SELECT rider_id FROM rider_wallet WHERE rider_id = ? FOR UPDATE", [riderId]);
    
    if (existing.length === 0) {
      await connection.execute("INSERT INTO rider_wallet (rider_id, balance) VALUES (?, ?)", [riderId, amount]);
    } else {
      await updateRiderBalance(connection, riderId, amount);
    }

    const [rows] = await connection.execute("SELECT balance FROM rider_wallet WHERE rider_id = ?", [riderId]);
    const newBalance = rows[0].balance;

    await recordTransaction(connection, {
      owner_id: riderId,
      owner_type: 'Rider',
      txn_type: 'TopUp',
      amount,
      balance_after: newBalance,
      note: 'Wallet top-up'
    });

    await connection.commit();
    return res.status(200).json(new ApiResponse(200, { newBalance }, "Top-up successful"));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * GET /api/v1/wallet/transactions
 */
const fetchTransactions = asyncHandler(async (req, res) => {
  const { userId, role } = req.user;
  const history = await getWalletHistory(userId, role);
  return res.status(200).json(new ApiResponse(200, history, "Transactions fetched"));
});

/**
 * POST /api/v1/wallet/payout
 */
const handlePayoutRequest = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const driverId = req.user.userId;

  const wallet = await getDriverWallet(driverId);
  if (wallet.balance < amount) {
    throw new ApiError(400, "Insufficient balance for payout");
  }

  const payoutId = await createPayoutRequest({ driver_id: driverId, amount });
  return res.status(201).json(new ApiResponse(201, { payoutId }, "Payout request submitted"));
});

/**
 * PATCH /api/v1/admin/payouts/:payoutId/process
 */
const handleProcessPayout = asyncHandler(async (req, res) => {
  const { payoutId } = req.params;
  const { action, admin_note } = req.body;

  const payout = await getPayoutById(payoutId);
  if (!payout) throw new ApiError(404, "Payout request not found");
  if (payout.status !== 'Pending') throw new ApiError(400, "Payout already processed");

  if (action === 'Rejected') {
    const connection = await pool.getConnection();
    await updatePayoutStatus(connection, payoutId, 'Rejected', admin_note);
    connection.release();
    return res.status(200).json(new ApiResponse(200, null, "Payout rejected"));
  }

  // Approved logic
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const wallet = await getDriverWallet(payout.driver_id);
    if (wallet.balance < payout.amount) {
      throw new ApiError(400, "Driver no longer has sufficient balance");
    }

    await updateDriverBalance(connection, payout.driver_id, -payout.amount);
    const [rows] = await connection.execute("SELECT balance FROM wallet WHERE driver_id = ?", [payout.driver_id]);
    const newBalance = rows[0].balance;

    await recordTransaction(connection, {
      owner_id: payout.driver_id,
      owner_type: 'Driver',
      txn_type: 'Payout',
      amount: payout.amount,
      balance_after: newBalance,
      note: admin_note || 'Payout approved'
    });

    await updatePayoutStatus(connection, payoutId, 'Processed', admin_note);

    await connection.commit();
    return res.status(200).json(new ApiResponse(200, null, "Payout processed successfully"));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * GET /api/v1/admin/payouts
 */
const fetchPayoutsAdmin = asyncHandler(async (req, res) => {
  const payouts = await getAllPayouts(req.query.status);
  return res.status(200).json(new ApiResponse(200, payouts, "Payouts fetched"));
});

/**
 * GET /api/v1/wallet/payouts
 */
const fetchMyPayouts = asyncHandler(async (req, res) => {
  const payouts = await getDriverPayouts(req.user.userId);
  return res.status(200).json(new ApiResponse(200, payouts, "My payouts fetched"));
});

export {
  getBalance,
  handleTopup,
  fetchTransactions,
  handlePayoutRequest,
  handleProcessPayout,
  fetchPayoutsAdmin,
  fetchMyPayouts
};
