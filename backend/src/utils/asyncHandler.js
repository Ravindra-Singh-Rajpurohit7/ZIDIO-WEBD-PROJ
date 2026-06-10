/**
 * Async Handler / Try-Catch Wrapper
 *
 * WHY: Without this, every async controller needs:
 *   try { ... } catch(err) { next(err) }
 *
 * This wrapper does that automatically.
 * Controllers stay clean — no try-catch boilerplate!
 *
 * HOW IT WORKS:
 * asyncHandler takes a function (fn)
 * Returns a new function that wraps fn in try-catch
 * If fn throws, error goes to Express error middleware via next(err)
 *
 * USAGE:
 *   export const login = asyncHandler(async (req, res) => {
 *     // No try-catch needed!
 *     const user = await User.findOne({ email })
 *     res.json(new ApiResponse(200, user, "Success"))
 *   })
 */

/**
 * @param {Function} requestHandler - Async controller function
 * @returns {Function} Express middleware that handles errors
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    // Wrap the handler in Promise.resolve to catch both
    // synchronous throws and async rejections
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };