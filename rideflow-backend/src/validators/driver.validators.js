/**
 * @file src/validators/driver.validators.js
 */
import Joi from "joi";

const updateAvailabilitySchema = Joi.object({
  status: Joi.string().valid("Online", "Offline").required(),
  city: Joi.string().when("status", {
    is: "Online",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

export { updateAvailabilitySchema };
