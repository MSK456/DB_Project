/**
 * @file src/validators/vehicle.validators.js
 */
import Joi from "joi";

const currentYear = new Date().getFullYear();

const addVehicleSchema = Joi.object({
  make: Joi.string().required(),
  model: Joi.string().required(),
  year: Joi.number().integer().min(2000).max(currentYear).required(),
  color: Joi.string().required(),
  license_plate: Joi.string().required(),
  vehicle_type: Joi.string().valid("Economy", "Premium", "Bike").required(),
});

const verifyVehicleSchema = Joi.object({
  status: Joi.string().valid("Verified", "Rejected").required(),
});

export { addVehicleSchema, verifyVehicleSchema };
