import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken"

export const VerifyJWT = asyncHandler(async (req, res, next) => {
    try {
        console.log("Cookies:", req.cookies);
        console.log("Auth Header:", req.header("authorization"));
        // Get token from cookie or Authorization header
        let token = req.cookies?.accessToken || req.cookies?.AccessToken;

        if (!token) {
            const authHeader = req.header("authorization");
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.replace("Bearer ", "");
            }
        }

        if (!token) {
            throw new ApiError(401, "Unauthorized Request");
        }

        // Verify token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Fetch user from DB
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        // Pass real error message if verification fails
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});
