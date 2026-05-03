import express from "express";
import authService from "../services/authService.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { config } from "../config/env.js";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * POST /api/auth/change-password
 *
 * Changes user password. Requires current password for verification.
 * On success: all other sessions are revoked (security).
 */
router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) throw new AppError("Current password is required", 400);
    if (!newPassword) throw new AppError("New password is required", 400);
    if (newPassword.length < 8) throw new AppError("Password must be at least 8 characters", 400);

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const result = await authService.changePassword({
      userId: decoded.userId,
      currentPassword,
      newPassword,
    });

    res.send({ success: true, message: "Password updated — please log in again on other devices", statusCode: 200 });
  })
);

/**
 * GET /api/auth/sessions
 *
 * Returns all active sessions for the current user.
 * Used by Settings > Security to show active devices.
 */
router.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const sessions = await authService.getActiveSessions(decoded.userId);
    const currentSessionId = req.headers["x-session-id"];
    const sessionsWithCurrent = (sessions || []).map((s) => ({
      ...s,
      isCurrent: s._id?.toString() === currentSessionId,
    }));
    res.send({ success: true, data: sessionsWithCurrent, statusCode: 200 });
  })
);

/**
 * DELETE /api/auth/sessions/:sessionId
 *
 * Revokes a specific session (sign out that device).
 */
router.delete(
  "/sessions/:sessionId",
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    await authService.revokeSession(decoded.userId, req.params.sessionId);
    res.send({ success: true, message: "Session ended", statusCode: 200 });
  })
);

/**
 * POST /api/auth/sessions/revoke-others
 *
 * Revokes all sessions except the current one.
 */
router.post(
  "/sessions/revoke-others",
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const currentFamily = req.headers["x-token-family"];
    const result = await authService.revokeOtherSessions(decoded.userId, currentFamily);
    res.send({ success: true, revokedCount: result.revokedCount, statusCode: 200 });
  })
);

/**
 * POST /api/auth/refresh
 *
 * Refreshes access token using a valid refresh token.
 */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError("Refresh token required", 400);

    const result = await authService.refreshTokens({ refreshToken, req });
    res.send({ success: true, ...result, statusCode: 200 });
  })
);

export default router;