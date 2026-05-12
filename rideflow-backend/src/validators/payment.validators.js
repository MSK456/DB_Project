/**
 * @file src/validators/payment.validators.js
 */
import Joi from "joi";

const processPaymentSchema = Joi.object({
  ride_id: Joi.number().integer().required(),
  payment_method: Joi.string().valid("Wallet", "Cash", "Card").required(),
  promo_code: Joi.string().allow(null, ""),
});

const topupSchema = Joi.object({
  amount: Joi.number().greater(0).max(50000).required(),
});

const payoutRequestSchema = Joi.object({
  amount: Joi.number().greater(0).required(),
});

const processPayoutSchema = Joi.object({
  action: Joi.string().valid("Approved", "Rejected").required(),
  admin_note: Joi.string().allow(null, ""),
});

export { processPaymentSchema, topupSchema, payoutRequestSchema, processPayoutSchema };
