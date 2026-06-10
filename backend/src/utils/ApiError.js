/**
 * Custom API Error Class
 *
 * WHY: Express ka default Error class standardized nahi hai.
 * Har jagah alag format ka error aata hai.
 * Yeh class ensure karta hai ki sab errors ek consistent
 * format mein aayein — statusCode, message, errors array.
 *
 * USAGE:
 *   throw new ApiError(400, "Email already exists")
 *   throw new ApiError(401, "Unauthorized", ["Token expired"])
 *   throw new ApiError(404, "User not found")
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500)
   * @param {string} message - Human readable error message
   * @param {Array} errors - Array of detailed errors (validation errors etc)
   * @param {string} stack - Optional custom stack trace
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    // Call parent Error constructor with message
    super(message);

    // HTTP status code
    this.statusCode = statusCode;

    // The actual error data (null for errors)
    this.data = null;

    // Human readable message
    this.message = message;

    // Success is always false for errors
    this.success = false;

    // Array of field-level errors (useful for validation)
    this.errors = errors;

    // Stack trace for debugging
    if (stack) {
      this.stack = stack;
    } else {
      // Captures stack trace, excluding constructor call from trace
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };