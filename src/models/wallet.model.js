/**
 * @file src/models/wallet.model.js
 */
import { pool } from "../db/index.js";

const getRiderWallet = async (riderId) => {
  const [rows] = await pool.execute("SELECT * FROM rider_wallet WHERE rider_id = ?", [riderId]);
  return rows[0];
};

const getDriverWallet = async (driverId) => {
  const [rows] = await pool.execute("SELECT * FROM wallet WHERE driver_id = ?", [driverId]);
  return rows[0];
};

const updateRiderBalance = async (connection, riderId, amount) => {
  await connection.execute(
    "UPDATE rider_wallet SET balance = balance + ? WHERE rider_id = ?",
    [amount, riderId]
  );
};

const updateDriverBalance = async (connection, driverId, amount) => {
  await connection.execute(
    "UPDATE wallet SET balance = balance + ? WHERE driver_id = ?",
    [amount, driverId]
  );
};

const recordTransaction = async (connection, txnData) => {
  const { owner_id, owner_type, txn_type, amount, balance_after, ref_id, ref_type, note } = txnData;
  await connection.execute(
    `INSERT INTO wallet_transaction 
     (wallet_owner_id, owner_type, txn_type, amount, balance_after, reference_id, reference_type, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [owner_id, owner_type, txn_type, amount, balance_after, ref_id || null, ref_type || null, note || null]
  );
};

const getWalletHistory = async (ownerId, ownerType) => {
  const [rows] = await pool.execute(
    "SELECT * FROM wallet_transaction WHERE wallet_owner_id = ? AND owner_type = ? ORDER BY created_at DESC",
    [ownerId, ownerType]
  );
  return rows;
};

const createPayoutRequest = async (payoutData) => {
  const { driver_id, amount } = payoutData;
  const [result] = await pool.execute(
    "INSERT INTO payout_request (driver_id, amount) VALUES (?, ?)",
    [driver_id, amount]
  );
  return result.insertId;
};

const getPayoutById = async (payoutId) => {
  const [rows] = await pool.execute("SELECT * FROM payout_request WHERE payout_id = ?", [payoutId]);
  return rows[0];
};

const getAllPayouts = async (status = null) => {
  let sql = `
    SELECT p.*, u.full_name as driver_name 
    FROM payout_request p
    JOIN user u ON p.driver_id = u.user_id
  `;
  const params = [];
  if (status) {
    sql += " WHERE p.status = ?";
    params.push(status);
  }
  sql += " ORDER BY p.requested_at DESC";
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const getDriverPayouts = async (driverId) => {
  const [rows] = await pool.execute(
    "SELECT * FROM payout_request WHERE driver_id = ? ORDER BY requested_at DESC",
    [driverId]
  );
  return rows;
};

const updatePayoutStatus = async (connection, payoutId, status, adminNote = null) => {
  await connection.execute(
    "UPDATE payout_request SET status = ?, admin_note = ?, processed_at = NOW() WHERE payout_id = ?",
    [status, adminNote, payoutId]
  );
};

export {
  getRiderWallet,
  getDriverWallet,
  updateRiderBalance,
  updateDriverBalance,
  recordTransaction,
  getWalletHistory,
  createPayoutRequest,
  getPayoutById,
  getAllPayouts,
  updatePayoutStatus,
  getDriverPayouts
};
