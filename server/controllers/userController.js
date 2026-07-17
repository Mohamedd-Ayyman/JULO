import express from "express";
import userService from "../services/userService.js";
import authService from "../services/authService.js";
import storyService from "../services/storyService.js";
import consentService from "../services/consentService.js";
import auditService from "../services/auditService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/rbac.js";
import { auditAction } from "../middlewares/auditMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, profileUpdateSchema, privacySettingsSchema } from "../utils/validate.js";
import { cacheMiddleware, invalidateCache } from "../middlewares/cacheMiddleware.js";
import User from "../models/user.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ── Auth-required profile reads ─────────────────────────────────────────
router.get(
  "/get-logged-in",
  requireAuth,
  cacheMiddleware("user:me", 60),
  asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.userId);
    res.send({ success: true, data: user, statusCode: 200 });
  })
);

router.get(
  "/get-all-users",
  requireAuth,
  cacheMiddleware("users:all", 30),
  asyncHandler(async (req, res) => {
    const result = await userService.getAllUsers(req.user.userId, req.query);
    res.send({ success: true, data: result.users, total: result.total, statusCode: 200 });
  })
);

router.put(
  "/update-profile",
  requireAuth,
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const updated = await userService.updateProfile(req.user.userId, req.body);
    await invalidateCache(`user:me:${req.user.userId}`);
    await invalidateCache(`user:*:${req.user.userId}:*`);
    res.send({ success: true, message: "Profile updated", data: updated, statusCode: 200 });
  })
);

router.get(
  "/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await userService.searchUsers(req.user.userId, req.query);
    res.send({ success: true, data: result.users, total: result.total, statusCode: 200 });
  })
);

router.get(
  "/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.params.userId);
    res.send({ success: true, data: user, statusCode: 200 });
  })
);

// ── Notification preferences ─────────────────────────────────────────────
router.put(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = ["messages", "comments", "likes", "follows", "mentions", "marketing"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[`notificationPrefs.${k}`] = req.body[k];
    });
    if (Object.keys(updates).length === 0) throw new AppError("No valid notification fields", 400);
    const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true, select: "-password" });
    if (!user) throw new AppError("User not found", 404);
    res.send({ success: true, message: "Notification preferences updated", data: user, statusCode: 200 });
  })
);

// ── Privacy settings ──────────────────────────────────────────────────────
router.put(
  "/privacy",
  requireAuth,
  validate(privacySettingsSchema),
  auditAction("update", "user"),
  asyncHandler(async (req, res) => {
    const allowed = ["isPrivate", "showOnlineStatus", "allowMessageRequests", "storyVisibility", "dataClassification", "privacyLevel"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true, select: "-password" });
    if (!user) throw new AppError("User not found", 404);
    await invalidateCache(`user:me:${req.user.userId}`);
    res.send({ success: true, message: "Privacy settings updated", data: user, statusCode: 200 });
  })
);

// ── Get privacy settings ────────────────────────────────────────────────
router.get(
  "/privacy",
  requireAuth,
  cacheMiddleware("user:privacy", 60),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select("isPrivate showOnlineStatus allowMessageRequests storyVisibility dataClassification privacyLevel").lean();
    if (!user) throw new AppError("User not found", 404);
    res.send({ success: true, data: user, statusCode: 200 });
  })
);

// ── Export user data (GDPR right to access) ─────────────────────────────
router.post(
  "/export-data",
  requireAuth,
  requirePermission("data:export_own"),
  auditAction("export", "user"),
  asyncHandler(async (req, res) => {
    const { format } = req.body;
    const user = await User.findById(req.user.userId).select("-password").lean();
    if (!user) throw new AppError("User not found", 404);

    const consents = await consentService.getUserConsents(req.user.userId, req.user.tenantId || null);
    const auditLogs = await auditService.getUserAuditTrail(req.user.userId, req.user.tenantId || null, { limit: 100 });

    const exportData = {
      profile: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      privacy: {
        isPrivate: user.isPrivate,
        showOnlineStatus: user.showOnlineStatus,
        allowMessageRequests: user.allowMessageRequests,
        storyVisibility: user.storyVisibility,
        dataClassification: user.dataClassification,
        privacyLevel: user.privacyLevel,
      },
      consents,
      recentActivity: auditLogs.logs,
      exportedAt: new Date().toISOString(),
      format: "json",
    };

    logger.info(`[User] Data exported: ${req.user.userId}`);
    res.send({ success: true, data: exportData, statusCode: 200 });
  })
);

// ── Get user's consent summary ──────────────────────────────────────────
router.get(
  "/consents",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const consents = await consentService.getUserConsents(req.user.userId, tenantId);
    res.send({ success: true, data: consents, statusCode: 200 });
  })
);

// ── Update user consents ────────────────────────────────────────────────
router.put(
  "/consents",
  requireAuth,
  requirePermission("consent:manage_own"),
  asyncHandler(async (req, res) => {
    const { consents } = req.body;
    if (!Array.isArray(consents)) throw new AppError("Consents must be an array", 400);

    const metadata = {
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const results = await consentService.bulkUpdateConsents(req.user.userId, consents, metadata);
    res.send({ success: true, data: results, statusCode: 200 });
  })
);

// ── Deactivate account (soft delete) ─────────────────────────────────────
router.post(
  "/deactivate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          isDeactivated: true,
          deactivatedAt: new Date(),
          email: `deactivated_${Date.now()}@deleted.julo`,
          firstname: "Deleted",
          lastname: "Account",
          profilepic: null,
        },
      },
      { new: true }
    );
    if (!user) throw new AppError("User not found", 404);
    await authService.logout({ userId: req.user.userId, allDevices: true });
    logger.info(`[User] Deactivated: ${req.user.userId}`);
    res.send({ success: true, message: "Account deactivated", statusCode: 200 });
  })
);

// ── Delete account (hard delete) ──────────────────────────────────────────
router.delete(
  "/account",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) throw new AppError("Password confirmation required", 400);

    const user = await User.findById(req.user.userId);
    if (!user) throw new AppError("User not found", 404);

    const bcrypt = await import("bcryptjs");
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) throw new AppError("Incorrect password", 401);

    const { notificationService } = await import("../services/notificationService.js");
    const { chatService } = await import("../services/chatService.js");
    const PushToken = (await import("../models/pushToken.js")).default;
    const NotificationPreferences = (await import("../models/notificationPreferences.js")).default;

    await Promise.all([
      storyService.deleteUserStories(req.user.userId),
      notificationService.deleteUserNotifications(req.user.userId),
      chatService.deleteUserChats(req.user.userId),
      PushToken.deleteMany({ userId: req.user.userId }),
      NotificationPreferences.deleteMany({ userId: req.user.userId }),
      authService.logout({ userId: req.user.userId, allDevices: true }),
    ]);

    await User.findByIdAndDelete(req.user.userId);
    logger.info(`[User] Hard deleted: ${req.user.userId}`);
    res.send({ success: true, message: "Account permanently deleted", statusCode: 200 });
  })
);

export default router;