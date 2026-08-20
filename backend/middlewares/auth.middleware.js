import jwt from "jsonwebtoken";
import User from "../models/user.model.js"; // Fixed import: it's a default export and points to our Prisma model
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"; // Fixed import: ApiError is a default export

export const protect = asyncHandler(async (req, res, next) => {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        token = header.split(" ")[1];
    }
    
    if (!token) {
        throw new ApiError(401, "Not authorized, no token provided");
    }
    
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new ApiError(401, "Not authorized, token invalid or expired");
    }
    
    // PRISMA TRANSLATION: Instead of Mongoose's findById, we use findUnique!
    const user = await User.findUnique({ 
        where: { id: decoded.id } 
    });

    if (!user) {
        throw new ApiError(401, "Not authorized, user no longer exists");
    }
    
    req.user = user;
    next();
});
