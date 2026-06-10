import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * VALIDATION MIDDLEWARE
 *
 * Works with express-validator chains.
 * Runs AFTER validation rules, checks for errors.
 *
 * USAGE in routes:
 *   router.post('/signup',
 *     [
 *       body('email').isEmail(),
 *       body('password').isLength({ min: 6 }),
 *       validate  // ← This checks results
 *     ],
 *     signupController
 *   )
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next(); // No errors, proceed
  }

  // Format errors into readable array
  const extractedErrors = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
    value: err.value,
  }));

  throw new ApiError(422, "Validation failed. Please check your input.", extractedErrors);
};

export { validate };