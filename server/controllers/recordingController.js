import express from "express";
import recordingService from "../services/recordingService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireConsent } from "../middlewares/consentMiddleware.js";
import { auditAction } from "../middlewares/auditMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, recordingCreateSchema, recordingUpdateSchema } from "../utils/validate.js";

const router = express.Router();

// ── Create recording metadata ──────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireConsent("recording"),
  validate(recordingCreateSchema),
  auditAction("create", "recording"),
  asyncHandler(async (req, res) => {
    const { chatId, fileUrl, fileSize, mimeType, format, duration, title, description, thumbnailUrl, transcription, tags, type, startedAt, endedAt } = req.body;

    const recording = await recordingService.createRecording(
      chatId,
      req.user.userId,
      req.user.tenantId || null,
      { fileUrl, fileSize, mimeType, format, duration, title, description, thumbnailUrl, transcription, tags, type, startedAt, endedAt }
    );

    res.status(201).send({ success: true, message: "Recording created", data: recording, statusCode: 201 });
  })
);

// ── Get recordings for a chat ──────────────────────────────────────────
router.get(
  "/chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await recordingService.getChatRecordings(
      req.params.chatId,
      req.user.userId,
      { page, limit }
    );
    res.send({ success: true, data: result.recordings, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get user's recordings ──────────────────────────────────────────────
router.get(
  "/user/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const tenantId = req.user.tenantId || null;
    const result = await recordingService.getUserRecordings(
      req.params.userId,
      tenantId,
      { page, limit }
    );
    res.send({ success: true, data: result.recordings, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Search recordings in a chat ────────────────────────────────────────
router.get(
  "/search/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;
    if (!q) throw new AppError("Search query is required", 400);

    const result = await recordingService.searchRecordings(
      req.params.chatId,
      req.user.userId,
      { q, page, limit }
    );
    res.send({ success: true, data: result.recordings, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get recording details ──────────────────────────────────────────────
router.get(
  "/:recordingId",
  requireAuth,
  auditAction("read", "recording"),
  asyncHandler(async (req, res) => {
    const recording = await recordingService.getRecording(
      req.params.recordingId,
      req.user.userId
    );
    res.send({ success: true, data: recording, statusCode: 200 });
  })
);

// ── Update recording metadata ──────────────────────────────────────────
router.put(
  "/:recordingId",
  requireAuth,
  validate(recordingUpdateSchema),
  auditAction("update", "recording"),
  asyncHandler(async (req, res) => {
    const recording = await recordingService.updateRecording(
      req.params.recordingId,
      req.user.userId,
      req.body
    );
    res.send({ success: true, message: "Recording updated", data: recording, statusCode: 200 });
  })
);

// ── Delete recording ───────────────────────────────────────────────────
router.delete(
  "/:recordingId",
  requireAuth,
  auditAction("delete", "recording"),
  asyncHandler(async (req, res) => {
    const result = await recordingService.deleteRecording(
      req.params.recordingId,
      req.user.userId
    );
    res.send({ success: true, message: "Recording deleted", data: result, statusCode: 200 });
  })
);

export default router;
