import express from "express";
import EncryptionSession from "../models/encryptionSession.js";
import Chat from "../models/chat.js";
import AuditLog from "../models/auditLog.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, encryptionSessionCreateSchema, encryptionSessionUpdateSchema, keyRotationSchema } from "../utils/validate.js";

const router = express.Router();

// ── Create encryption session ───────────────────────────────────────
router.post(
  "/sessions",
  requireAuth,
  validate(encryptionSessionCreateSchema),
  asyncHandler(async (req, res) => {
    const { chatId, partnerId, sessionData, rootKey, chainKey } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || null;

    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found", statusCode: 404 });
    }

    if (!chat.members.some((m) => String(m) === String(userId))) {
      return res.status(403).json({ success: false, message: "Not a member of this chat", statusCode: 403 });
    }

    const existing = await EncryptionSession.findOne({ chatId, userId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Session already exists", statusCode: 409 });
    }

    const session = await EncryptionSession.create({
      chatId,
      userId,
      partnerId,
      sessionData,
      rootKey,
      chainKey,
      tenantId,
    });

    await Chat.findByIdAndUpdate(chatId, {
      isEncrypted: true,
      encryptionType: "e2e",
      lastKeyRotation: new Date(),
    });

    await AuditLog.create({
      userId,
      action: "create",
      resource: "encryption_session",
      resourceId: session._id.toString(),
      metadata: { chatId, partnerId },
      tenantId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: { sessionId: session._id, chatId, createdAt: session.createdAt },
      statusCode: 201,
    });
  })
);

// ── Get session for a chat ──────────────────────────────────────────
router.get(
  "/sessions/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;

    const session = await EncryptionSession.findOne({ chatId, userId }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found", statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        chatId: session.chatId,
        partnerId: session.partnerId,
        messageNumber: session.messageNumber,
        previousChainLength: session.previousChainLength,
        rootKey: session.rootKey,
        chainKey: session.chainKey,
        sendingKey: session.sendingKey,
        receivingKey: session.receivingKey,
        lastActiveAt: session.lastActiveAt,
      },
      statusCode: 200,
    });
  })
);

// ── Update ratchet state ────────────────────────────────────────────
router.put(
  "/sessions/:chatId",
  requireAuth,
  validate(encryptionSessionUpdateSchema),
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { messageNumber, previousChainLength, rootKey, chainKey, sendingKey, receivingKey, sessionData } = req.body;
    const userId = req.user.userId;

    const session = await EncryptionSession.findOne({ chatId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found", statusCode: 404 });
    }

    if (messageNumber !== undefined) session.messageNumber = messageNumber;
    if (previousChainLength !== undefined) session.previousChainLength = previousChainLength;
    if (rootKey) session.rootKey = rootKey;
    if (chainKey) session.chainKey = chainKey;
    if (sendingKey !== undefined) session.sendingKey = sendingKey;
    if (receivingKey !== undefined) session.receivingKey = receivingKey;
    if (sessionData) session.sessionData = sessionData;
    session.lastActiveAt = new Date();

    await session.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        messageNumber: session.messageNumber,
        lastActiveAt: session.lastActiveAt,
      },
      statusCode: 200,
    });
  })
);

// ── Delete session ──────────────────────────────────────────────────
router.delete(
  "/sessions/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.userId;

    const session = await EncryptionSession.findOneAndDelete({ chatId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found", statusCode: 404 });
    }

    await AuditLog.create({
      userId,
      action: "delete",
      resource: "encryption_session",
      resourceId: session._id.toString(),
      metadata: { chatId },
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { deleted: true },
      statusCode: 200,
    });
  })
);

// ── Rotate keys for sessions ────────────────────────────────────────
router.post(
  "/rotate-keys",
  requireAuth,
  validate(keyRotationSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { chatId, newSessionData, newRootKey, newChainKey } = req.body;

    const sessions = chatId
      ? [await EncryptionSession.findOne({ chatId, userId })]
      : await EncryptionSession.find({ $or: [{ userId }, { partnerId: userId }] });

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ success: false, message: "No sessions found", statusCode: 404 });
    }

    let rotated = 0;
    for (const session of sessions) {
      if (!session) continue;
      session.rootKey = newRootKey || session.rootKey;
      session.chainKey = newChainKey || session.chainKey;
      session.sessionData = newSessionData || session.sessionData;
      session.previousChainLength += session.messageNumber;
      session.messageNumber = 0;
      session.lastActiveAt = new Date();
      await session.save();
      rotated++;
    }

    if (chatId) {
      await Chat.findByIdAndUpdate(chatId, { lastKeyRotation: new Date() });
    }

    await AuditLog.create({
      userId,
      action: "update",
      resource: "encryption_session",
      resourceId: userId.toString(),
      metadata: { sessionsRotated: rotated, chatId: chatId || "all" },
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { sessionsRotated: rotated },
      statusCode: 200,
    });
  })
);

export default router;
