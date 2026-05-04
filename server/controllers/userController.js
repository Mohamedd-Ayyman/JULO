import express from "express";
import userService from "../services/userService.js";
import authService from "../services/authService.js";
import storyService from "../services/storyService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, profileUpdateSchema } from "../utils/validate.js";
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
  asyncHandler(async (req, res) => {
    const allowed = ["isPrivate", "showOnlineStatus", "allowMessageRequests", "storyVisibility"];
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

    await Promise.all([
      storyService.deleteUserStories(req.user.userId),
      notificationService.deleteUserNotifications(req.user.userId),
      chatService.deleteUserChats(req.user.userId),
      authService.logout({ userId: req.user.userId, allDevices: true }),
    ]);

    await User.findByIdAndDelete(req.user.userId);
    logger.info(`[User] Hard deleted: ${req.user.userId}`);
    res.send({ success: true, message: "Account permanently deleted", statusCode: 200 });
  })
);

export default router;