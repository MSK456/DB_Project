/**
 * @file src/models/promo.model.js
 */
import { pool } from "../db/index.js";

const findPromoByCode = async (code) => {
  const [rows] = await pool.execute("SELECT * FROM promo_code WHERE code = ?", [code]);
  return rows[0];
};

const createPromo = async (promoData) => {
  const { code, discount_type, discount_value, min_ride_amount, expiry_date, max_usage } = promoData;
  const [result] = await pool.execute(
    `INSERT INTO promo_code (code, discount_type, discount_value, min_ride_amount, expiry_date, max_usage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code, discount_type, discount_value, min_ride_amount || 0, expiry_date, max_usage || null]
  );
  return result.insertId;
};

const getAllPromos = async (onlyActive = false) => {
  let sql = "SELECT * FROM promo_code";
  if (onlyActive) {
    sql += " WHERE is_active = TRUE AND expiry_date >= CURDATE()";
  }
  const [rows] = await pool.execute(sql);
  return rows;
};

const deactivatePromo = async (code) => {
  await pool.execute("UPDATE promo_code SET is_active = FALSE WHERE code = ?", [code]);
};

export { findPromoByCode, createPromo, getAllPromos, deactivatePromo };
