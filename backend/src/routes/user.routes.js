import { Router } from "express";
import { body } from "express-validator";
import { getProfile, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/profile", getProfile);

router.put(
    "/profile",
    [
        body("fullName")
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be between 2 and 50 charaters"),
        
        body("bio")
            .optional()
            .trim()
            .isLength({ max: 300 })
            .withMessage("Bio must be under 300 characters"),

        validate,
    ],
    updateProfile
);

export default router;