/**
 * @file src/middlewares/validate.middleware.js
 * @description Factory function that creates reusable Express validation middleware.
 *              Validates req.body against a provided Joi schema before the request
 *              reaches the controller layer, keeping controllers clean.
 */

import { ApiError } from "../utils/ApiError.js";

/**
 * Creates an Express middleware that validates req.body against the given Joi schema.
 * On failure, throws ApiError(400) with a list of all validation error messages.
 * On success, calls next() to proceed to the controller.
 *
 * @param {import("joi").Schema} schema - A compiled Joi schema object.
 * @returns {Function} Express middleware function (req, res, next).
 *
 * @example
 * router.post("/register", validateBody(riderRegistrationSchema), registerUser);
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      // Report ALL validation errors at once, not just the first one.
      abortEarly: false,
      // Ignore any extra fields the client sends that are not in the schema.
      allowUnknown: true,
      // Strip those unknown fields from req.body so they don't reach the controller.
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return next(new ApiError(400, "Validation Error", errorMessages));
    }

    next();
  };
};

export { validateBody };
