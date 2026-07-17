import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { uploadChatMediaMulti, magicByteValidator } from "../middlewares/upload.js";
import mediaService from "../services/mediaService.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, mediaQuerySchema } from "../utils/validate.js";
import { emitToChat } from "../utils/socket.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.post(
  "/upload",
  requireAuth,
  tenantMiddleware,
  (req, res, next) => {
    uploadChatMediaMulti.array("files", 10)(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ success: false, message: "One or more files exceed the 50MB size limit", statusCode: 400 });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ success: false, message: "Maximum 10 files allowed per upload", statusCode: 400 });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ success: false, message: "Unsupported file type", statusCode: 400 });
        }
        return res.status(400).json({ success: false, message: err.message || "Upload failed", statusCode: 400 });
      }
      next();
    });
  },
  magicByteValidator,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError("No files provided", 400);
    }

    const chatId = req.body.chatId || null;
    const mediaFiles = await mediaService.uploadFiles(
      req.user.userId,
      req.tenantId,
      chatId,
      req.files
    );

    if (chatId) {
      try {
        emitToChat(chatId, "media_uploaded", {
          chatId,
          uploadedBy: req.user.userId,
          files: mediaFiles.map((m) => ({
            _id: m._id,
            mediaType: m.mediaType,
            cdnUrl: m.cdnUrl,
            thumbnailUrl: m.thumbnailUrl,
            originalName: m.originalName,
            mimeType: m.mimeType,
            fileSize: m.fileSize,
          })),
        });
      } catch (_) {}
    }

    res.status(201).send({
      success: true,
      data: mediaFiles.map((m) => ({
        _id: m._id,
        mediaType: m.mediaType,
        cdnUrl: m.cdnUrl,
        thumbnailUrl: m.thumbnailUrl,
        optimizedUrl: m.optimizedUrl,
        signedUrl: m.signedUrl,
        signedUrlExpiresAt: m.signedUrlExpiresAt,
        originalName: m.originalName,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        width: m.width,
        height: m.height,
      })),
      message: `${mediaFiles.length} file(s) uploaded`,
      statusCode: 201,
    });
  })
);

router.get(
  "/:mediaId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const media = await mediaService.getMedia(req.params.mediaId, req.user.userId);
    res.send({ success: true, data: media, statusCode: 200 });
  })
);

router.get(
  "/chat/:chatId",
  requireAuth,
  tenantMiddleware,
  validate(mediaQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, mediaType } = req.query;
    const result = await mediaService.listChatMedia(req.params.chatId, req.user.userId, {
      page,
      limit,
      mediaType,
    });

    res.send({
      success: true,
      data: result.media,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statusCode: 200,
    });
  })
);

router.delete(
  "/:mediaId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await mediaService.deleteMedia(req.params.mediaId, req.user.userId);

    try {
      const Media = (await import("../models/media.js")).default;
      const mediaDoc = await Media.findById(req.params.mediaId).lean().catch(() => null);
      if (mediaDoc && mediaDoc.chatId) {
        emitToChat(String(mediaDoc.chatId), "media_deleted", {
          mediaId: req.params.mediaId,
          chatId: String(mediaDoc.chatId),
          deletedBy: req.user.userId,
        });
        await invalidateCache(`chat:${mediaDoc.chatId}:*`);
      }
    } catch (_) {}

    res.send({ success: true, message: "Media deleted", data: result, statusCode: 200 });
  })
);

router.post(
  "/:mediaId/refresh-url",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await mediaService.refreshSignedUrl(req.params.mediaId, req.user.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

export default router;
