import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

/**
 * AppError — custom error class with statusCode + standardized response shape.
 * All async controller functions use asyncHandler + AppError so every error
 * hits the global error middleware in a uniform way.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * asyncHandler — wraps async route handlers so try/catch is centralized.
 * Any thrown error (including AppError) goes straight to next().
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};