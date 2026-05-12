/**
 * @file src/utils/promoUtils.js
 * @description Shared logic for validating promo codes.
 */
import { ApiError } from "./ApiError.js";

/**
 * Validates a promo code against a ride fare.
 * @param {Object} promo - The promo record from DB
 * @param {number} rideFare - The base fare of the ride
 * @returns {Object} { discountAmount, finalAmount }
 * @throws {ApiError} If promo is invalid for any reason
 */
const validatePromoLogic = (promo, rideFare) => {
  if (!promo) {
    throw new ApiError(404, "Invalid promo code");
  }

  if (!promo.is_active) {
    throw new ApiError(400, "This promo code is no longer active");
  }

  const now = new Date();
  const expiry = new Date(promo.expiry_date);
  if (expiry < now) {
    throw new ApiError(400, "This promo code has expired");
  }

  if (promo.max_usage !== null && promo.usage_count >= promo.max_usage) {
    throw new ApiError(400, "This promo code has reached its usage limit");
  }

  if (rideFare < promo.min_ride_amount) {
    throw new ApiError(400, `Minimum ride amount of PKR ${promo.min_ride_amount} required for this promo`);
  }

  let discountAmount = 0;
  if (promo.discount_type === 'Percent') {
    discountAmount = (rideFare * promo.discount_value) / 100;
  } else {
    discountAmount = Math.min(promo.discount_value, rideFare);
  }

  const finalAmount = Math.max(0, rideFare - discountAmount);

  return {
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    finalAmount: parseFloat(finalAmount.toFixed(2))
  };
};

export { validatePromoLogic };
