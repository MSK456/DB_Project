/**
 * @file src/validators/ride.validators.js
 */
import Joi from "joi";

const requestRideSchema = Joi.object({
  pickup_location: Joi.string().required(),
  pickup_city: Joi.string().optional(),
  dropoff_location: Joi.string().required(),
  dropoff_city: Joi.string().optional(),
  vehicle_type: Joi.string().valid("Economy", "Premium", "Bike").required(),
});

const completeRideSchema = Joi.object({
  distance_km: Joi.number().positive().required(),
  duration_minutes: Joi.number().integer().positive().required(),
  is_surge: Joi.boolean().default(false),
});

export { requestRideSchema, completeRideSchema };
