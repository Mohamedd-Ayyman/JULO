import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import { AppError } from "../utils/AppError.js";
import logger from "./logger.js";
import { config } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";

// ── Sentry error tracking (if SENTRY_DSN is set) ───────────────────────────────
let Sentry;
try {
  if (process.env.SENTRY_DSN) {
    ({ Sentry } = await import("@sentry/node"));
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: config.nodeEnv,
      release: process.env.HEROKU_SLUG_COMMIT || "julo@" + require("../package.json").version,
      tracesSampleRate: config.isProduction ? 0.1 : 0,
      initialScope: (scope) => {
        scope.setTag("service", "julo-api");
        return scope;
      },
    });
  }
} catch {
  // Sentry not available — observability will rely on logger only
}

/**
 * Global error handler — the single source of truth for all error responses.
 * Shapes every response to: { success: false, message, statusCode }
 * Also captures errors to Sentry when configured.
 */
export const globalErrorHandler = (err, req, res, next) => {
  const requestId = req.requestId || uuidv4();

  // Multer file size / field errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).send({ success: false, message: "File too large (max 10MB)", statusCode: 413 });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).send({ success: false, message: "Unexpected file field", statusCode: 400 });
  }

  // Operational AppErrors (trusted business logic errors)
  if (err instanceof AppError) {
    logger.warn(err.message, {
      statusCode: err.statusCode,
      path: req.originalUrl,
      requestId,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
    });
    return res.status(err.statusCode).send({ success: false, message: err.message, statusCode: err.statusCode });
  }

  // Errors with statusCode set (e.g., from services using Error + statusCode)
  if (err.statusCode && typeof err.statusCode === "number") {
    logger.warn(err.message || "Error with statusCode", {
      statusCode: err.statusCode,
      path: req.originalUrl,
      requestId,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
    });
    return res.status(err.statusCode).send({
      success: false,
      message: err.message || "An error occurred",
      statusCode: err.statusCode,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).send({ success: false, message: "Invalid token", statusCode: 401 });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).send({ success: false, message: "Session expired", statusCode: 401 });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).send({ success: false, message: "Invalid ID format", statusCode: 400 });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join(", ");
    return res.status(422).send({ success: false, message: msg || "Validation error", statusCode: 422 });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).send({ success: false, message: `Duplicate ${field}`, statusCode: 409 });
  }

  // Unexpected errors — capture to Sentry + structured log
  const errorId = uuidv4();
  logger.error("Unhandled error", {
    error: err.message,
    errorId,
    stack: config.isDevelopment ? err.stack : undefined,
    path: req.originalUrl,
    requestId,
    method: req.method,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
  });

  // Capture to Sentry with trace context
  if (Sentry) {
    Sentry.withScope((scope) => {
      scope.setTag("errorId", errorId);
      scope.setTag("requestId", requestId);
      scope.setUser({ id: req.user?.userId, tenantId: req.user?.tenantId });
      scope.setExtra("path", req.originalUrl);
      scope.setExtra("method", req.method);
      Sentry.captureException(err);
    });
  }

  const message = config.isProduction
    ? `An error occurred. Reference: ${errorId}`
    : err.message;

  res.status(500).send({ success: false, message, statusCode: 500, errorId });
};

/**
 * 404 handler — catches requests to undefined routes.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).send({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  });
};