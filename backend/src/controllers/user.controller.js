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
    const { fullName, bio, avatar, prefrences } = req.body;
    const allowedUpdates = {};
    if (fullName !== undefined) allowedUpdates.fullName = fullName;
    if (bio !== undefined) allowedUpdates.bio = bio;
    if (avatar !== undefined) allowedUpdates.avatar = avatar;
    if (preferences !== undefined) allowedUpdates.preferences = prefrences;
    if (Object.keys(allowedUpdates).length === 0){
        throw new ApiError(400, "No valid fields porvoided to update.");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: alllowedUpdates },
        { new: true, runValidators: true}
    );
    if(!updartedUser){
        throw new ApiError(404, "User not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { user: updatedUser }, "Profile Updated Successfully"));
});

export { getProfile, updateProfile };