/**
 * @file src/validators/promo.validators.js
 */
import Joi from "joi";

const createPromoSchema = Joi.object({
  code: Joi.string().uppercase().min(4).max(20).alphanum().required(),
  discount_type: Joi.string().valid("Percent", "Flat").required(),
  discount_value: Joi.number().greater(0).when("discount_type", {
    is: "Percent",
    then: Joi.number().max(100),
  }).required(),
  min_ride_amount: Joi.number().min(0).default(0),
  expiry_date: Joi.date().greater("now").required(),
  max_usage: Joi.number().integer().min(1).allow(null),
});

const validatePromoSchema = Joi.object({
  code: Joi.string().required(),
  ride_fare: Joi.number().required(),
});

export { createPromoSchema, validatePromoSchema };
