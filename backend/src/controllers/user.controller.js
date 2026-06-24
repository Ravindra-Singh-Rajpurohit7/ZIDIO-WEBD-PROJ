import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.js";

const getProfile = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, { user: req.user }, "Profile fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, bio, avatar, preferences } = req.body;
    const allowedUpdates = {};
    if (fullName !== undefined) allowedUpdates.fullName = fullName;
    if (bio !== undefined) allowedUpdates.bio = bio;
    if (avatar !== undefined) allowedUpdates.avatar = avatar;
    if (preferences !== undefined) allowedUpdates.preferences = preferences;
    if (Object.keys(allowedUpdates).length === 0){
        throw new ApiError(400, "No valid fields porvoided to update.");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: allowedUpdates },
        { new: true, runValidators: true}
    );
    if(!updatedUser){
        throw new ApiError(404, "User not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { user: updatedUser }, "Profile Updated Successfully"));
});

export { getProfile, updateProfile, getAdminStats };


// ═══════════════════════════════════════════════════════
// ADMIN STATS (Test RBAC)
// GET /api/v1/users/admin/stats
// ═══════════════════════════════════════════════════════
const getAdminStats = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                stats: {
                    totalUser: 42,
                    activeNow: 7,
                    signupsToday: 3,
                },
                adminUser: req.user.email,
            },
            "Admin stats retrives succesdsfully"
        )
    )
});