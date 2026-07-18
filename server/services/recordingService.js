import Recording from "../models/recording.js";
import Chat from "../models/chat.js";
import cloudinary from "../config/cloudinary.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const DEFAULT_RETENTION_DAYS = 30;

export class RecordingService {
  async createRecording(chatId, senderId, tenantId, metadata) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }

    if (!chat.members.some((m) => String(m) === String(senderId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + DEFAULT_RETENTION_DAYS);

    const recording = await Recording.create({
      chatId,
      sender: senderId,
      tenantId,
      fileUrl: metadata.fileUrl,
      fileSize: metadata.fileSize || 0,
      mimeType: metadata.mimeType || null,
      format: metadata.format || null,
      duration: metadata.duration,
      participants: chat.members,
      title: metadata.title || null,
      description: metadata.description || null,
      thumbnailUrl: metadata.thumbnailUrl || null,
      transcription: metadata.transcription || null,
      tags: metadata.tags || [],
      type: metadata.type || "voice_message",
      status: metadata.status || "ready",
      startedAt: metadata.startedAt || null,
      endedAt: metadata.endedAt || null,
      retentionExpiresAt,
      callSessionId: metadata.callSessionId || null,
      initiatedBy: metadata.initiatedBy || null,
    });

    logger.info(`[Recording] Created: ${recording._id} in chat ${chatId} (expires: ${retentionExpiresAt.toISOString()})`);
    return Recording.findById(recording._id)
      .populate("sender", "firstname lastname profilepic")
      .populate("participants", "firstname lastname profilepic");
  }

  async getRecording(recordingId, userId) {
    const recording = await Recording.findById(recordingId)
      .populate("sender", "firstname lastname profilepic")
      .populate("participants", "firstname lastname profilepic")
      .lean();

    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }

    if (recording.status === "deleted") {
      const err = new Error("Recording has been deleted");
      err.statusCode = 404;
      throw err;
    }

    const isParticipant = recording.participants.some(
      (p) => String(p._id) === String(userId)
    );
    const isSender = String(recording.sender._id) === String(userId);

    if (!isParticipant && !isSender) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      throw err;
    }

    return recording;
  }

  async getChatRecordings(chatId, userId, { page = 1, limit = 20 } = {}) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }

    if (!chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const query = { chatId, status: { $ne: "deleted" } };

    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .lean(),
      Recording.countDocuments(query),
    ]);

    return {
      recordings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getUserRecordings(userId, tenantId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const query = {
      $or: [{ sender: userId }, { participants: userId }],
      status: { $ne: "deleted" },
    };
    if (tenantId) query.tenantId = tenantId;

    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .populate("chatId", "members")
        .lean(),
      Recording.countDocuments(query),
    ]);

    return {
      recordings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async updateRecording(recordingId, userId, updates) {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }

    if (String(recording.sender) !== String(userId)) {
      const err = new Error("Only the recording owner can update it");
      err.statusCode = 403;
      throw err;
    }

    if (recording.status === "deleted") {
      const err = new Error("Recording has been deleted");
      err.statusCode = 404;
      throw err;
    }

    const allowed = ["title", "description", "thumbnailUrl", "transcription", "tags"];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        recording[key] = updates[key];
      }
    }

    await recording.save();

    return Recording.findById(recording._id)
      .populate("sender", "firstname lastname profilepic")
      .populate("participants", "firstname lastname profilepic");
  }

  async deleteRecording(recordingId, userId) {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }

    if (String(recording.sender) !== String(userId)) {
      const err = new Error("Only the recording owner can delete it");
      err.statusCode = 403;
      throw err;
    }

    if (recording.fileUrl) {
      try {
        await this.deleteFromCloudinary(recording.fileUrl);
      } catch (error) {
        logger.error(`[Recording] Cloudinary deletion failed: ${error.message}`);
      }
    }

    recording.status = "deleted";
    await recording.save();

    logger.info(`[Recording] Deleted: ${recordingId}`);
    return { deleted: true };
  }

  async deleteFromCloudinary(fileUrl) {
    if (!fileUrl) return;

    const isCloudinaryConfigured = Boolean(
      config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
    );

    if (!isCloudinaryConfigured) {
      logger.warn("[Recording] Cloudinary not configured, skipping file deletion");
      return;
    }

    const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (!match) {
      logger.warn(`[Recording] Could not extract public ID from URL: ${fileUrl}`);
      return;
    }

    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    logger.info(`[Recording] Deleted Cloudinary file: ${publicId}`);
  }

  async searchRecordings(chatId, userId, { q, page = 1, limit = 20 } = {}) {
    const chat = await Chat.findById(chatId).lean();
    if (!chat) {
      const err = new Error("Chat not found");
      err.statusCode = 404;
      throw err;
    }

    if (!chat.members.some((m) => String(m) === String(userId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const query = {
      chatId,
      status: { $ne: "deleted" },
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { transcription: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ],
    };

    const [recordings, total] = await Promise.all([
      Recording.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .lean(),
      Recording.countDocuments(query),
    ]);

    return {
      recordings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async updateRecordingStatus(recordingId, status) {
    const recording = await Recording.findByIdAndUpdate(
      recordingId,
      { status },
      { new: true }
    );
    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }
    return recording;
  }
}

export default new RecordingService();
