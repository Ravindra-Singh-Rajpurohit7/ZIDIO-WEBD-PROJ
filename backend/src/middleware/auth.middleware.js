import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/User.js";

/**
 * VERIFY JWT MIDDLEWARE
 *
 * Extracts and verifies the JWT access token from:
 * 1. Authorization header: "Bearer <token>"
 * 2. Cookies: req.cookies.accessToken (optional)
 *
 * If valid, attaches user object to req.user
 * If invalid/missing, throws 401 ApiError
 */
const verifyJWT = asyncHandler(async (req, _, next) => {
  // ─── Step 1: Extract Token ──────────────────────────
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(
      401,
      "Unauthorized: Access token is missing. Please login."
    );
  }

  // ─── Step 2: Verify Token ───────────────────────────
  // jwt.verify throws JsonWebTokenError or TokenExpiredError
  // These are caught by the global error handler in app.js
  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  // ─── Step 3: Find User ──────────────────────────────
  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "Unauthorized: User not found. Token is invalid.");
  }

  // ─── Step 4: Check Account Status ──────────────────
  if (!user.isActive) {
    throw new ApiError(
      403,
      "Account is deactivated. Please contact support."
    );
  }

  // ─── Step 5: Attach User to Request ─────────────────
  req.user = user;
  next();
});

/**
 * REQUIRE ROLE MIDDLEWARE
 * Factory function that creates role-checking middleware
 *
 * Usage: requireRole("admin", "super_admin")
 * This middleware must come AFTER verifyJWT
 */
const requireRole = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required before role check");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`
      );
    }

    next();
  });
};

/**
 * OPTIONAL AUTH MIDDLEWARE
 * Attaches user to req if token exists, but doesn't throw if missing
 * Useful for routes that work for both authenticated and guest users
 */
const optionalAuth = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    req.user = user || null;
  } catch {
    req.user = null; // Token invalid but don't throw
  }

  next();
});

export { verifyJWT, requireRole, optionalAuth };