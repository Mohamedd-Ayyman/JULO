import express from "express";
import PushToken from "../models/pushToken.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate } from "../utils/validate.js";
import pushService from "../services/pushService.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ── Register a push token ──────────────────────────────────────────────
router.post(
  "/tokens",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { token, platform, deviceInfo } = req.body;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      throw new AppError("Token is required", 400);
    }
    if (!platform || !["ios", "android", "web"].includes(platform)) {
      throw new AppError("Platform must be ios, android, or web", 400);
    }

    const existing = await PushToken.findOne({ token: token.trim() });

    if (existing) {
      existing.userId = req.user.userId;
      existing.platform = platform;
      existing.active = true;
      existing.lastUsedAt = new Date();
      if (deviceInfo) existing.deviceInfo = deviceInfo;
      if (req.tenantId) existing.tenantId = req.tenantId;
      await existing.save();
      return res.send({ success: true, data: existing, statusCode: 200 });
    }

    const pushToken = await PushToken.create({
      userId: req.user.userId,
      token: token.trim(),
      platform,
      deviceInfo: deviceInfo || null,
      tenantId: req.tenantId || null,
    });

    logger.info(`[Push] Token registered for user ${req.user.userId} on ${platform}`);
    res.status(201).send({ success: true, data: pushToken, statusCode: 201 });
  })
);

// ── Remove a push token ────────────────────────────────────────────────
router.delete(
  "/tokens/:token",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await PushToken.findOneAndDelete({
      token: req.params.token,
      userId: req.user.userId,
    });

    if (!result) {
      throw new AppError("Token not found", 404);
    }

    logger.info(`[Push] Token removed for user ${req.user.userId}`);
    res.send({ success: true, message: "Token removed", statusCode: 200 });
  })
);

// ── Remove all push tokens for current user ────────────────────────────
router.delete(
  "/tokens",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { platform } = req.query;
    const query = { userId: req.user.userId };
    if (platform) query.platform = platform;

    const result = await PushToken.deleteMany(query);

    logger.info(`[Push] Removed ${result.deletedCount} tokens for user ${req.user.userId}`);
    res.send({ success: true, message: "Tokens removed", deletedCount: result.deletedCount, statusCode: 200 });
  })
);

// ── Get all active tokens for current user ─────────────────────────────
router.get(
  "/tokens",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const tokens = await PushToken.find({ userId: req.user.userId, active: true })
      .select("-token")
      .sort({ lastUsedAt: -1 })
      .lean();

    res.send({ success: true, data: tokens, statusCode: 200 });
  })
);

// ── Deactivate a token without deleting ────────────────────────────────
router.put(
  "/tokens/:token/deactivate",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await PushToken.findOneAndUpdate(
      { token: req.params.token, userId: req.user.userId },
      { $set: { active: false } },
      { new: true }
    );

    if (!result) {
      throw new AppError("Token not found", 404);
    }

    res.send({ success: true, message: "Token deactivated", statusCode: 200 });
  })
);

// ── Send test push notification ────────────────────────────────────────
router.post(
  "/test",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const tokens = await PushToken.find({ userId: req.user.userId, active: true });

    if (tokens.length === 0) {
      throw new AppError("No active push tokens found. Register a device first.", 404);
    }

    if (!pushService.isAvailable()) {
      throw new AppError("Push notifications not configured on this server", 503);
    }

    const registrationTokens = tokens.map((t) => t.token);
    const notification = {
      notification: {
        title: "Test Notification",
        body: "Push notifications are working!",
      },
      data: {
        type: "test",
      },
    };

    const multicast = (await import("firebase-admin")).default;
    const { messaging } = multicast;

    const result = await messaging().sendEachForMulticast({
      tokens: registrationTokens,
      ...notification,
    });

    const invalidTokenCount = result.responses.filter((r) => {
      const code = r.error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
    }).length;

    if (invalidTokenCount > 0) {
      const invalidTokens = result.responses
        .map((r, i) => (r.success ? null : registrationTokens[i]))
        .filter(Boolean);

      await PushToken.updateMany(
        { token: { $in: invalidTokens } },
        { $set: { active: false } }
      );
    }

    res.send({
      success: true,
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
      statusCode: 200,
    });
  })
);

export default router;
