/**
 * Standard API Response Class
 *
 * WHY: Every API should return data in the same format.
 * Frontend always knows what to expect:
 * { statusCode, data, message, success }
 *
 * USAGE:
 *   return res.status(200).json(
 *     new ApiResponse(200, { user }, "User fetched successfully")
 *   )
 *
 *   return res.status(201).json(
 *     new ApiResponse(201, { meeting }, "Meeting created")
 *   )
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {any} data - The actual response data
   * @param {string} message - Human readable success message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    // Automatically determine success based on status code
    // 2xx = success, 4xx/5xx = error
    this.success = statusCode < 400;
  }
}

export { ApiResponse };