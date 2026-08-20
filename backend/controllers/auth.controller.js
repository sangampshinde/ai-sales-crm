import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js"; 
import ApiError from "../utils/ApiError.js"; 
import { generateToken } from "../utils/generateToken.js";

// Helper function to format the user object before sending it to the frontend.
// PRISMA TRANSLATION: We use `user.id` instead of `user._id`!
const toClientUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    avatar: user.avatar,
    createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => { 
    const { name, email, password, company } = req.body;
    
    if (!name || !email || !password) {
        throw new ApiError(400, "Name, email and password are required");
    }
    
    // PRISMA TRANSLATION: findUnique with where clause
    const exists = await User.findUnique({ 
        where: { email: email.toLowerCase() } 
    }); 
    
    if (exists) {
        throw new ApiError(409, "An account with that email already exists");
    }
    
    // PRISMA TRANSLATION: pass fields inside a `data` object
    const user = await User.create({ 
        data: { name, email: email.toLowerCase(), password, company } 
    });
    
    res.status(201).json({
        success: true,
        // PRISMA TRANSLATION: use user.id instead of user._id
        token: generateToken(user.id),
        user: toClientUser(user),
    });
});

export const login = asyncHandler(async (req, res) => { 
    const { email, password } = req.body;
    
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }
    
    // PRISMA TRANSLATION: findUnique with where clause. 
    // Prisma selects the password by default, so we don't need `.select("+password")`
    const user = await User.findUnique({ 
        where: { email: email.toLowerCase() } 
    });
    
    // Our custom Prisma Extension `matchPassword` works exactly like the tutorial's Mongoose method!
    if (!user || !(await user.matchPassword(password))) {
        throw new ApiError(401, "Invalid email or password");
    }
    
    res.json({
        success: true,
        token: generateToken(user.id),
        user: toClientUser(user),
    });
});

// TODO: Paste your logout function below!
