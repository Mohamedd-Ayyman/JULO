import express from "express";
import notificationService from "../services/notificationService.js";
import NotificationPreferences from "../models/notificationPreferences.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";

const router = express.Router();

const VALID_TYPES = [
  "messages", "comments", "likes", "follows", "mentions",
  "threadReplies", "chatMentions", "shares", "marketing",
];
const VALID_CHANNELS = ["push", "inApp", "email"];

// ── Get all notifications ──────────────────────────────────────────────
router.get(
  "/all",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await notificationService.getAll(req.user.userId, req.tenantId, req.query);
    res.send({ success: true, data: result.notifications, unreadCount: result.unreadCount, statusCode: 200 });
  })
);

// ── Mark all read ──────────────────────────────────────────────────────
router.put(
  "/read-all",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.userId, req.tenantId);
    res.send({ success: true, message: "All notifications marked as read", statusCode: 200 });
  })
);

// ── Mark one read ──────────────────────────────────────────────────────
router.put(
  "/:notificationId/read",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.markOneRead(req.params.notificationId, req.user.userId, req.tenantId);
    res.send({ success: true, message: "Notification marked as read", statusCode: 200 });
  })
);

// ── Delete one notification ────────────────────────────────────────────
router.delete(
  "/:notificationId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.delete(req.params.notificationId, req.user.userId, req.tenantId);
    res.send({ success: true, message: "Notification deleted", statusCode: 200 });
  })
);

// ── Get notification preferences ───────────────────────────────────────
router.get(
  "/preferences",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    let prefs = await NotificationPreferences.findOne({
      userId: req.user.userId,
      tenantId: req.tenantId || null,
    }).lean();

    if (!prefs) {
      prefs = await NotificationPreferences.create({
        userId: req.user.userId,
        tenantId: req.tenantId || null,
      });
      prefs = prefs.toObject();
    }

    res.send({ success: true, data: prefs, statusCode: 200 });
  })
);

// ── Update notification preferences ────────────────────────────────────
// Supports partial updates per type and channel
// e.g. { messages: { push: false }, likes: { push: false, email: true } }
router.put(
  "/preferences",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { preferences, quietHours } = req.body;
    const updates = {};

    if (preferences) {
      for (const [type, channels] of Object.entries(preferences)) {
        if (!VALID_TYPES.includes(type)) {
          throw new AppError(`Invalid notification type: ${type}`, 400);
        }
        for (const [channel, enabled] of Object.entries(channels)) {
          if (!VALID_CHANNELS.includes(channel)) {
            throw new AppError(`Invalid channel: ${channel}. Must be push, inApp, or email`, 400);
          }
          if (typeof enabled !== "boolean") {
            throw new AppError(`Channel value must be boolean`, 400);
          }
          updates[`preferences.${type}.${channel}`] = enabled;
        }
      }
    }

    if (quietHours !== undefined) {
      if (quietHours && typeof quietHours === "object") {
        if (quietHours.start && !/^\d{2}:\d{2}$/.test(quietHours.start)) {
          throw new AppError("Quiet hours start must be in HH:mm format", 400);
        }
        if (quietHours.end && !/^\d{2}:\d{2}$/.test(quietHours.end)) {
          throw new AppError("Quiet hours end must be in HH:mm format", 400);
        }
        updates["quietHours.enabled"] = quietHours.enabled ?? true;
        if (quietHours.start) updates["quietHours.start"] = quietHours.start;
        if (quietHours.end) updates["quietHours.end"] = quietHours.end;
        if (quietHours.timezone) updates["quietHours.timezone"] = quietHours.timezone;
      } else {
        updates["quietHours.enabled"] = false;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError("No valid preference fields provided", 400);
    }

    const prefs = await NotificationPreferences.findOneAndUpdate(
      { userId: req.user.userId, tenantId: req.tenantId || null },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    logger.info(`[Notification] Preferences updated for user ${req.user.userId}`);
    res.send({ success: true, message: "Preferences updated", data: prefs, statusCode: 200 });
  })
);

// ── Reset preferences to defaults ──────────────────────────────────────
router.delete(
  "/preferences",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await NotificationPreferences.findOneAndDelete({
      userId: req.user.userId,
      tenantId: req.tenantId || null,
    });

    const prefs = await NotificationPreferences.create({
      userId: req.user.userId,
      tenantId: req.tenantId || null,
    });

    res.send({ success: true, message: "Preferences reset to defaults", data: prefs, statusCode: 200 });
  })
);

export default router;