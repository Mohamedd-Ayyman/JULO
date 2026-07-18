import express from "express";
import participantService from "../services/participantService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate } from "../utils/validate.js";
import { emitToChat, emitToUser } from "../utils/socket.js";

const router = express.Router();

// ── Get participants for a chat ─────────────────────────────────────
router.get(
  "/chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await participantService.getParticipants(req.params.chatId, req.query);
    res.send({ success: true, data: result.participants, total: result.total, statusCode: 200 });
  })
);

// ── Get my participation in a chat ──────────────────────────────────
router.get(
  "/chat/:chatId/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await participantService.getParticipant(req.params.chatId, req.user.userId);
    if (!participant) {
      return res.status(404).json({ success: false, message: "Not a participant", statusCode: 404 });
    }
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Add participants to a chat ──────────────────────────────────────
router.post(
  "/chat/:chatId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { userIds, role } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "userIds array is required", statusCode: 400 });
    }

    const results = await participantService.addMultipleParticipants(
      req.params.chatId,
      userIds,
      { role, addedBy: req.user.userId, tenantId: req.tenantId }
    );

    try {
      userIds.forEach((uid) => {
        emitToChat(req.params.chatId, "participant_added", {
          chatId: req.params.chatId,
          userId: uid,
          addedBy: req.user.userId,
          role: role || "member",
        });
        emitToUser(uid, "chat_invitation", {
          chatId: req.params.chatId,
          addedBy: req.user.userId,
          role: role || "member",
        });
      });
    } catch (_) {}

    res.status(201).send({ success: true, data: results, statusCode: 201 });
  })
);

// ── Remove participant from a chat ──────────────────────────────────
router.delete(
  "/chat/:chatId/user/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await participantService.removeParticipant(req.params.chatId, req.params.userId, req.user.userId);

    try {
      emitToChat(req.params.chatId, "participant_removed", {
        chatId: req.params.chatId,
        userId: req.params.userId,
        removedBy: req.user.userId,
      });
    } catch (_) {}

    res.send({ success: true, message: "Participant removed", statusCode: 200 });
  })
);

// ── Leave a chat ────────────────────────────────────────────────────
router.post(
  "/chat/:chatId/leave",
  requireAuth,
  asyncHandler(async (req, res) => {
    await participantService.removeParticipant(req.params.chatId, req.user.userId, req.user.userId);

    try {
      emitToChat(req.params.chatId, "participant_removed", {
        chatId: req.params.chatId,
        userId: req.user.userId,
        removedBy: req.user.userId,
        left: true,
      });
    } catch (_) {}

    res.send({ success: true, message: "Left chat", statusCode: 200 });
  })
);

// ── Update participant role ─────────────────────────────────────────
router.put(
  "/chat/:chatId/user/:userId/role",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!role || !["admin", "moderator", "member"].includes(role)) {
      return res.status(400).json({ success: false, message: "Valid role required (admin, moderator, member)", statusCode: 400 });
    }

    const participant = await participantService.updateRole(
      req.params.chatId,
      req.params.userId,
      role,
      req.user.userId
    );

    try {
      emitToChat(req.params.chatId, "participant_role_changed", {
        chatId: req.params.chatId,
        userId: req.params.userId,
        newRole: role,
        changedBy: req.user.userId,
      });
    } catch (_) {}

    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Mute/unmute ─────────────────────────────────────────────────────
router.put(
  "/chat/:chatId/mute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { muted, mutedUntil } = req.body;
    const participant = await participantService.setMuted(
      req.params.chatId,
      req.user.userId,
      muted,
      mutedUntil ? new Date(mutedUntil) : null
    );
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Archive/unarchive ───────────────────────────────────────────────
router.put(
  "/chat/:chatId/archive",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { archived } = req.body;
    const participant = archived
      ? await participantService.setArchived(req.params.chatId, req.user.userId, true)
      : await participantService.setArchived(req.params.chatId, req.user.userId, false);
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Pin/unpin chat ──────────────────────────────────────────────────
router.put(
  "/chat/:chatId/pin",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { pinned } = req.body;
    const participant = pinned
      ? await participantService.setPinned(req.params.chatId, req.user.userId, true)
      : await participantService.setPinned(req.params.chatId, req.user.userId, false);
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Set nickname ────────────────────────────────────────────────────
router.put(
  "/chat/:chatId/nickname",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { nickname } = req.body;
    const participant = await participantService.setNickname(req.params.chatId, req.user.userId, nickname || null);
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Toggle notifications ────────────────────────────────────────────
router.put(
  "/chat/:chatId/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const participant = await participantService.setNotifications(req.params.chatId, req.user.userId, enabled);
    res.send({ success: true, data: participant, statusCode: 200 });
  })
);

// ── Get my chats (via participant model) ────────────────────────────
router.get(
  "/my-chats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { archived, page, limit } = req.query;
    const result = await participantService.getUserChats(req.user.userId, {
      archived: archived === "true",
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
    res.send({ success: true, data: result.chats, total: result.total, statusCode: 200 });
  })
);

export default router;
