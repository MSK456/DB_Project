/**
 * @file src/validators/auth.validators.js
 * @description Joi validation schemas for all authentication-related endpoints.
 *              Joi was chosen over express-validator for its expressive chaining API,
 *              built-in regex support, and cleaner error message customization.
 */

import Joi from "joi";

// ─────────────────────────────────────────────────────────────────────────────
//  PASSWORD RULE (reused across schemas)
//  Min 8 chars | At least: 1 uppercase, 1 digit, 1 special character
// ─────────────────────────────────────────────────────────────────────────────
const passwordRule = Joi.string()
  .min(8)
  .pattern(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    "must contain at least one uppercase letter, one number, and one special character"
  )
  .required()
  .messages({
    "string.min": "Password must be at least 8 characters long.",
    "string.pattern.name":
      "Password must contain at least one uppercase letter, one digit, and one special character.",
    "any.required": "Password is required.",
  });

// ─────────────────────────────────────────────────────────────────────────────
//  RIDER REGISTRATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Joi schema for Rider registration.
 * Fields: full_name, email, phone, password.
 */
const riderRegistrationSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Full name must be at least 2 characters.",
    "string.max": "Full name must not exceed 100 characters.",
    "any.required": "Full name is required.",
  }),

  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required.",
  }),

  phone: Joi.string()
    .min(10)
    .max(15)
    .pattern(/^\d+$/, "numeric only")
    .required()
    .messages({
      "string.min": "Phone number must be at least 10 digits.",
      "string.max": "Phone number must not exceed 15 digits.",
      "string.pattern.name": "Phone number must contain digits only.",
      "any.required": "Phone number is required.",
    }),

  password: passwordRule,

  // role is allowed in the body but is not validated here —
  // the controller enforces role-specific logic separately.
  role: Joi.string().valid("Rider", "Driver").optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
//  DRIVER REGISTRATION SCHEMA (extends Rider fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Joi schema for Driver registration.
 * Extends Rider schema with license_number and cnic.
 */
const driverRegistrationSchema = riderRegistrationSchema.keys({
  license_number: Joi.string().min(1).required().messages({
    "any.required": "License number is required for driver registration.",
    "string.empty": "License number cannot be empty.",
  }),

  // Pakistani CNIC format: XXXXX-XXXXXXX-X (13 digits, dashes optional)
  cnic: Joi.string()
    .pattern(/^\d{5}-?\d{7}-?\d{1}$/, "Pakistani CNIC format XXXXX-XXXXXXX-X")
    .required()
    .messages({
      "string.pattern.name":
        "CNIC must follow the Pakistani format: XXXXX-XXXXXXX-X.",
      "any.required": "CNIC is required for driver registration.",
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
//  LOGIN SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Joi schema for user login.
 * Fields: email, password.
 */
const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required.",
  }),

  password: Joi.string().min(1).required().messages({
    "any.required": "Password is required.",
    "string.empty": "Password cannot be empty.",
  }),
});

export { riderRegistrationSchema, driverRegistrationSchema, loginSchema };
