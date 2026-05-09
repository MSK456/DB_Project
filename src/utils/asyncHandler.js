/**
 * @file src/utils/asyncHandler.js
 * @description Higher-order function that wraps async Express route handlers.
 *              Catches any unhandled promise rejections and forwards them to
 *              Express's next() error handler — eliminating try/catch boilerplate
 *              from every controller function.
 */

/**
 * Wraps an async Express route handler and automatically catches errors.
 * @param {Function} requestHandler - Async (req, res, next) Express handler.
 * @returns {Function} Standard Express middleware function.
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };