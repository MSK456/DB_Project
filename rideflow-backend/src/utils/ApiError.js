/**
 * @file src/utils/ApiError.js
 * @description Custom error class that extends the native Error object.
 *              Provides a consistent shape for all error responses in the app.
 */

/**
 * Represents an operational API error with an HTTP status code.
 * @extends Error
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 404, 409, 500).
   * @param {string} [message="Something went wrong."] - Human-readable error message.
   * @param {Array}  [errors=[]] - Array of detailed validation or field errors.
   * @param {string} [stack=""] - Optional stack trace override.
   */
  constructor(
    statusCode,
    message = "Something went wrong.",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };