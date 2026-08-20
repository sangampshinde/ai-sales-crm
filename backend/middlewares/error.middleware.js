import ApiError from "../utils/ApiError.js";

// 404 handler for unmatched route

export const notFound = (req, res, next) => {
    next(new ApiError(404, `Route Not Found - ${req.method} ${req.originalUrl}`));
}

export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    // Prisma Error: Record not found (e.g. invalid ID)
    if (err.code === 'P2025') {
        statusCode = 404;
        message = `Resource not found`;
    }

    // Prisma Error: Unique constraint failed (e.g. duplicate email)
    if (err.code === 'P2002') {
        statusCode = 409;
        const field = err.meta?.target?.[0] || "field";
        message = `A record with that ${field} already exists`;
    }

    // Prisma Error: Validation Error (e.g. missing required fields)
    if (err.name === "PrismaClientValidationError") {
        statusCode = 400;
        message = "Invalid data provided";
    }

    if (process.env.NODE_ENV !== "production" && statusCode === 500) {
        console.error(err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && statusCode === 500 ? { stack: err.stack } : {})
    });
};

