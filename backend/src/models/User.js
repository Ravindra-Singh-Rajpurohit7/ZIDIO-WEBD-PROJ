import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    // ─── BASIC INFORMATION ──────────────────────────────
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries by default
    },

    // ─── PROFILE ─────────────────────────────────────────
    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
      default: "",
    },

    // ─── ROLE & PERMISSIONS ──────────────────────────────
    role: {
      type: String,
      enum: {
        values: ["super_admin", "admin", "member", "guest"],
        message: "Role must be: super_admin, admin, member, or guest",
      },
      default: "member",
    },

    // ─── AUTHENTICATION TOKENS ───────────────────────────
    refreshToken: {
      type: String,
      select: false, // Never return in queries
    },

    // ─── EMAIL VERIFICATION ──────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    // ─── PASSWORD RESET ───────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpiry: {
      type: Date,
      select: false,
    },

    // ─── ACTIVITY TRACKING ───────────────────────────────
    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // ─── TEAMS REFERENCE ─────────────────────────────────
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    // ─── USER PREFERENCES ────────────────────────────────
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        meetingReminders: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
    },

    // ─── ACCOUNT STATUS ──────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      // Transform output — remove sensitive fields
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ═══════════════════════════════════════════════════════
// INDEXES
// Improve query performance for frequent lookups
// ═══════════════════════════════════════════════════════
userSchema.index({ email: 1 }); // Login queries
userSchema.index({ teams: 1 }); // Team member lookups
userSchema.index({ isOnline: 1 }); // Online users list
userSchema.index({ createdAt: -1 }); // Recent users

// ═══════════════════════════════════════════════════════
// PRE-SAVE HOOK: Hash password before saving
// Runs automatically before every .save() call
// ═══════════════════════════════════════════════════════
userSchema.pre("save", async function (next) {
  // Only hash if password was actually modified
  // (prevents re-hashing on other field updates)
  if (!this.isModified("password")) return next();

  // Hash password with cost factor 10
  // Higher = more secure but slower (10-12 is production standard)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ═══════════════════════════════════════════════════════
// INSTANCE METHODS
// Methods available on individual user documents
// ═══════════════════════════════════════════════════════

/**
 * Compare plain password with hashed password
 * Usage: const isValid = await user.isPasswordCorrect("mypassword123")
 */
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Generate JWT Access Token
 * Short-lived (15 minutes)
 * Sent in response body, stored in memory on frontend
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    }
  );
};

/**
 * Generate JWT Refresh Token
 * Long-lived (7 days)
 * Stored in httpOnly cookie (not accessible by JS)
 * Used to generate new access tokens without re-login
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    }
  );
};

/**
 * Virtual: Check if account is locked
 */
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

const User = mongoose.model("User", userSchema);

export default User;