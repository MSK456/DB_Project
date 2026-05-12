/**
 * @file src/utils/tokenUtils.js
 * @description JWT helper functions for generating and verifying access and refresh tokens.
 *              Keeps all token logic in one place so it can be updated centrally.
 */

import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError.js";

/**
 * Generates a short-lived JWT access token.
 * Payload includes: userId, email, role — enough for auth checks without a DB hit.
 * @param {{ userId: number, email: string, role: string }} payload
 * @returns {string} Signed JWT string.
 */
const generateAccessToken = ({ userId, email, role }) => {
  return jwt.sign({ userId, email, role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
  });
};

/**
 * Generates a long-lived JWT refresh token.
 * Payload is minimal (only userId) to limit exposure if intercepted.
 * @param {{ userId: number }} payload
 * @returns {string} Signed JWT string.
 */
const generateRefreshToken = ({ userId }) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
  });
};

/**
 * Verifies an access token and returns the decoded payload.
 * @param {string} token - JWT access token string.
 * @returns {{ userId: number, email: string, role: string }} Decoded payload.
 * @throws {ApiError} 401 if the token is invalid or expired.
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired access token.");
  }
};

/**
 * Verifies a refresh token and returns the decoded payload.
 * @param {string} token - JWT refresh token string.
 * @returns {{ userId: number }} Decoded payload.
 * @throws {ApiError} 401 if the token is invalid or expired.
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
