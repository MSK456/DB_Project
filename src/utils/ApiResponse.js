/**
 * @file src/utils/ApiResponse.js
 * @description Standardised success response wrapper for all API endpoints.
 *              Ensures every response shares the same JSON shape.
 */

/**
 * Represents a successful API response.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (< 400 treated as success).
   * @param {*}      data       - The payload to return (object, array, null, etc.).
   * @param {string} [message="Success"] - Human-readable description of the result.
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };