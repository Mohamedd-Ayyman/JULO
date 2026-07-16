import express from "express";
import callSessionService from "../services/callSessionService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { auditAction } from "../middlewares/auditMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { getIO } from "../utils/socket.js";

const router = express.Router();

// ── Initiate a call ────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  auditAction("create", "call"),
  asyncHandler(async (req, res) => {
    const { chatId, callType } = req.body;
    if (!chatId) throw new AppError("chatId is required", 400);

    const call = await callSessionService.initiateCall(
      chatId,
      req.user.userId,
      req.user.tenantId || null,
      callType || "audio"
    );

    const io = getIO();
    io.to(`chat:${chatId}`).emit("call_invite", {
      callId: call._id,
      initiator: call.initiator,
      callType: call.callType,
      participants: call.participants,
    });

    res.status(201).send({ success: true, message: "Call initiated", data: call, statusCode: 201 });
  })
);

// ── Accept a call ──────────────────────────────────────────────────────
router.post(
  "/:callId/accept",
  requireAuth,
  auditAction("update", "call"),
  asyncHandler(async (req, res) => {
    const call = await callSessionService.acceptCall(req.params.callId, req.user.userId);

    const io = getIO();
    io.to(`chat:${call.chatId}`).emit("call_accepted", {
      callId: call._id,
      userId: req.user.userId,
    });

    res.send({ success: true, message: "Call accepted", data: call, statusCode: 200 });
  })
);

// ── Reject a call ──────────────────────────────────────────────────────
router.post(
  "/:callId/reject",
  requireAuth,
  auditAction("update", "call"),
  asyncHandler(async (req, res) => {
    const call = await callSessionService.rejectCall(req.params.callId, req.user.userId);

    const io = getIO();
    io.to(`chat:${call.chatId}`).emit("call_rejected", {
      callId: call._id,
      userId: req.user.userId,
    });

    res.send({ success: true, message: "Call rejected", data: call, statusCode: 200 });
  })
);

// ── End a call ─────────────────────────────────────────────────────────
router.post(
  "/:callId/end",
  requireAuth,
  auditAction("update", "call"),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const call = await callSessionService.endCall(req.params.callId, req.user.userId, reason);

    const io = getIO();
    io.to(`chat:${call.chatId}`).emit("call_ended", {
      callId: call._id,
      duration: call.duration,
      endReason: call.endReason,
    });

    res.send({ success: true, message: "Call ended", data: call, statusCode: 200 });
  })
);

// ── Get active call for a chat ─────────────────────────────────────────
router.get(
  "/active/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const call = await callSessionService.getActiveCall(req.params.chatId);
    res.send({ success: true, data: call, statusCode: 200 });
  })
);

// ── Get call history for a chat ────────────────────────────────────────
router.get(
  "/history/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await callSessionService.getCallHistory(
      req.params.chatId,
      req.user.userId,
      { page, limit }
    );
    res.send({ success: true, data: result.calls, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get user's call history ────────────────────────────────────────────
router.get(
  "/my-history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const tenantId = req.user.tenantId || null;
    const result = await callSessionService.getUserCallHistory(
      req.user.userId,
      tenantId,
      { page, limit }
    );
    res.send({ success: true, data: result.calls, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get call details ───────────────────────────────────────────────────
router.get(
  "/:callId",
  requireAuth,
  auditAction("read", "call"),
  asyncHandler(async (req, res) => {
    const call = await callSessionService.getCallDetails(
      req.params.callId,
      req.user.userId
    );
    res.send({ success: true, data: call, statusCode: 200 });
  })
);

// ── Grant recording consent ────────────────────────────────────────────
router.post(
  "/:callId/consent",
  requireAuth,
  auditAction("update", "call"),
  asyncHandler(async (req, res) => {
    const call = await callSessionService.grantRecordingConsent(
      req.params.callId,
      req.user.userId
    );

    const canRecord = await callSessionService.canStartRecording(req.params.callId);
    const io = getIO();
    io.to(`chat:${call.chatId}`).emit("call_consent_updated", {
      callId: call._id,
      userId: req.user.userId,
      canStartRecording: canRecord.allowed,
    });

    res.send({ success: true, message: "Recording consent granted", data: { call, canStartRecording: canRecord.allowed }, statusCode: 200 });
  })
);

// ── Revoke recording consent ───────────────────────────────────────────
router.delete(
  "/:callId/consent",
  requireAuth,
  auditAction("update", "call"),
  asyncHandler(async (req, res) => {
    const call = await callSessionService.revokeRecordingConsent(
      req.params.callId,
      req.user.userId
    );

    const io = getIO();
    io.to(`chat:${call.chatId}`).emit("call_consent_updated", {
      callId: call._id,
      userId: req.user.userId,
      canStartRecording: false,
    });

    res.send({ success: true, message: "Recording consent revoked", data: call, statusCode: 200 });
  })
);

// ── Get recording consent status ───────────────────────────────────────
router.get(
  "/:callId/consent/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await callSessionService.getRecordingConsentStatus(
      req.params.callId
    );
    res.send({ success: true, data: status, statusCode: 200 });
  })
);

export default router;
