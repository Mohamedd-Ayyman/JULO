import Media from "../models/media.js";
import Chat from "../models/chat.js";
import { uploadBuffer, generateThumbnailUrl, generateOptimizedUrl, generateSignedUrl, deleteResource, getMediaType } from "../utils/cdn.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

export class MediaService {
  async uploadFiles(uploaderId, tenantId, chatId, files) {
    if (!files || files.length === 0) {
      const err = new Error("No files provided");
      err.statusCode = 400;
      throw err;
    }

    if (chatId) {
      const chat = await Chat.findById(chatId).lean();
      if (!chat) {
        const err = new Error("Chat not found");
        err.statusCode = 404;
        throw err;
      }
      if (!chat.members.some((m) => String(m) === String(uploaderId))) {
        const err = new Error("Not a member of this chat");
        err.statusCode = 403;
        throw err;
      }
    }

    const results = [];
    for (const file of files) {
      const mediaType = getMediaType(file.mimetype);

      const folder = chatId
        ? `julo/chat/${mediaType === "image" ? "images" : mediaType === "audio" ? "audio" : "files"}`
        : `julo/uploads/${mediaType === "image" ? "images" : mediaType === "audio" ? "audio" : "files"}`;

      const resourceType = mediaType === "audio" ? "video" : mediaType === "file" ? "raw" : "image";

      const uploadResult = await uploadBuffer(file.buffer, {
        folder,
        resourceType,
        mimeType: file.mimetype,
      });

      const cdnUrl = uploadResult.secure_url;
      const thumbnailUrl = generateThumbnailUrl(cdnUrl, mediaType);
      const optimizedUrl = generateOptimizedUrl(cdnUrl, mediaType);
      const signedUrl = generateSignedUrl(cdnUrl, mediaType, config.upload.signedUrlTtl);

      const mediaDoc = await Media.create({
        uploaderId,
        chatId: chatId || null,
        tenantId: tenantId || null,
        mediaType,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storageKey: uploadResult.public_id,
        cdnUrl,
        thumbnailUrl,
        optimizedUrl,
        signedUrl,
        signedUrlExpiresAt: new Date(Date.now() + config.upload.signedUrlTtl * 1000),
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        metadata: {
          format: uploadResult.format || null,
          bytes: uploadResult.bytes || file.size,
          resourceType: uploadResult.resource_type || null,
        },
      });

      results.push(mediaDoc);
      logger.info(`[Media] Uploaded: ${mediaDoc._id} (${mediaType}) by ${uploaderId}`);
    }

    return results;
  }

  async getMedia(mediaId, userId) {
    const media = await Media.findById(mediaId).lean();
    if (!media) {
      const err = new Error("Media not found");
      err.statusCode = 404;
      throw err;
    }
    if (media.deleted) {
      const err = new Error("Media has been deleted");
      err.statusCode = 404;
      throw err;
    }

    if (media.chatId) {
      const chat = await Chat.findById(media.chatId).lean();
      if (!chat || !chat.members.some((m) => String(m) === String(userId))) {
        const err = new Error("Not authorized to access this media");
        err.statusCode = 403;
        throw err;
      }
    } else if (String(media.uploaderId) !== String(userId)) {
      const err = new Error("Not authorized to access this media");
      err.statusCode = 403;
      throw err;
    }

    const signedUrl = generateSignedUrl(media.cdnUrl, media.mediaType, config.upload.signedUrlTtl);

    return { ...media, signedUrl };
  }

  async listChatMedia(chatId, userId, { page = 1, limit = 20, mediaType } = {}) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }
    if (!chat.members.some((m) => String(m) === String(userId))) {
      const err = "Not a member of this chat";
      const error = new Error(err);
      error.statusCode = 403;
      throw error;
    }

    const query = { chatId, deleted: false };
    if (mediaType) query.mediaType = mediaType;

    const skip = (Number(page) - 1) * Number(limit);
    const [media, total] = await Promise.all([
      Media.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("uploaderId", "firstname lastname profilepic")
        .lean(),
      Media.countDocuments(query),
    ]);

    return {
      media,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async deleteMedia(mediaId, userId) {
    const media = await Media.findById(mediaId);
    if (!media) {
      const err = new Error("Media not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(media.uploaderId) !== String(userId)) {
      const err = new Error("Only the uploader can delete media");
      err.statusCode = 403;
      throw err;
    }
    if (media.deleted) {
      const err = new Error("Media is already deleted");
      err.statusCode = 400;
      throw err;
    }

    await deleteResource(media.cdnUrl);

    media.deleted = true;
    await media.save();

    logger.info(`[Media] Deleted: ${mediaId} by ${userId}`);
    return { deleted: true };
  }

  async cleanupChatMedia(chatId) {
    const result = await Media.deleteMany({ chatId });
    logger.info(`[Media] Cleaned up ${result.deletedCount} media files for chat ${chatId}`);
    return { deletedCount: result.deletedCount };
  }

  async cleanupMessageMedia(messageId) {
    const result = await Media.updateMany({ messageId }, { deleted: true });
    logger.info(`[Media] Marked ${result.modifiedCount} media as deleted for message ${messageId}`);
    return { deletedCount: result.modifiedCount };
  }

  async refreshSignedUrl(mediaId, userId) {
    const media = await Media.findById(mediaId).lean();
    if (!media) {
      const err = new Error("Media not found");
      err.statusCode = 404;
      throw err;
    }
    if (media.deleted) {
      const err = new Error("Media has been deleted");
      err.statusCode = 404;
      throw err;
    }

    const signedUrl = generateSignedUrl(media.cdnUrl, media.mediaType, config.upload.signedUrlTtl);

    await Media.findByIdAndUpdate(mediaId, {
      signedUrl,
      signedUrlExpiresAt: new Date(Date.now() + config.upload.signedUrlTtl * 1000),
    });

    return { signedUrl, expiresAt: new Date(Date.now() + config.upload.signedUrlTtl * 1000) };
  }
}

export default new MediaService();
