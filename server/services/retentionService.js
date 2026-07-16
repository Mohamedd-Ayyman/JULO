import Recording from "../models/recording.js";
import cloudinary from "../config/cloudinary.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const DEFAULT_RETENTION_DAYS = 30;

export class RetentionService {
  async scheduleRetention(recordingId, days = DEFAULT_RETENTION_DAYS) {
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + days);

    const recording = await Recording.findByIdAndUpdate(
      recordingId,
      { retentionExpiresAt },
      { new: true }
    );

    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }

    logger.info(`[Retention] Scheduled: recording=${recordingId} expires=${retentionExpiresAt.toISOString()}`);
    return recording;
  }

  async checkExpiredRecordings() {
    const expired = await Recording.find({
      retentionExpiresAt: { $lte: new Date() },
      status: { $ne: "deleted" },
    }).lean();

    logger.info(`[Retention] Found ${expired.length} expired recordings`);
    return expired;
  }

  async deleteExpiredRecordings() {
    const expired = await this.checkExpiredRecordings();
    const results = [];

    for (const recording of expired) {
      try {
        await this.deleteRecordingFile(recording.fileUrl);
        await Recording.findByIdAndUpdate(recording._id, { status: "deleted" });
        results.push({ recordingId: recording._id, success: true });
        logger.info(`[Retention] Deleted expired recording: ${recording._id}`);
      } catch (error) {
        results.push({ recordingId: recording._id, success: false, error: error.message });
        logger.error(`[Retention] Failed to delete recording: ${recording._id}`, { error: error.message });
      }
    }

    logger.info(`[Retention] Cleanup complete: ${results.filter((r) => r.success).length}/${expired.length} deleted`);
    return results;
  }

  async deleteRecordingFile(fileUrl) {
    if (!fileUrl) return;

    const isCloudinaryConfigured = Boolean(
      config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
    );

    if (!isCloudinaryConfigured) {
      logger.warn("[Retention] Cloudinary not configured, skipping file deletion");
      return;
    }

    try {
      const publicId = this._extractPublicId(fileUrl);
      if (!publicId) {
        logger.warn(`[Retention] Could not extract public ID from URL: ${fileUrl}`);
        return;
      }

      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      logger.info(`[Retention] Deleted Cloudinary file: ${publicId}`);
    } catch (error) {
      logger.error(`[Retention] Cloudinary deletion failed: ${error.message}`);
      throw error;
    }
  }

  async deleteRecordingById(recordingId) {
    const recording = await Recording.findById(recordingId);
    if (!recording) {
      const err = new Error("Recording not found");
      err.statusCode = 404;
      throw err;
    }

    if (recording.status === "deleted") {
      return { deleted: true, alreadyDeleted: true };
    }

    await this.deleteRecordingFile(recording.fileUrl);
    recording.status = "deleted";
    await recording.save();

    logger.info(`[Retention] Manually deleted recording: ${recordingId}`);
    return { deleted: true };
  }

  async getRetentionStats(tenantId = null) {
    const matchStage = {};
    if (tenantId) matchStage.tenantId = tenantId;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + DEFAULT_RETENTION_DAYS);

    const stats = await Recording.aggregate([
      { $match: { ...matchStage, status: { $ne: "deleted" } } },
      {
        $facet: {
          total: [{ $count: "count" }],
          expiringSoon: [
            {
              $match: {
                retentionExpiresAt: { $lte: thirtyDaysFromNow, $gt: now },
              },
            },
            { $count: "count" },
          ],
          expired: [
            {
              $match: {
                retentionExpiresAt: { $lte: now },
              },
            },
            { $count: "count" },
          ],
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const result = stats[0] || {};
    return {
      total: result.total?.[0]?.count || 0,
      expiringSoon: result.expiringSoon?.[0]?.count || 0,
      expired: result.expired?.[0]?.count || 0,
      byType: result.byType || [],
      retentionDays: DEFAULT_RETENTION_DAYS,
    };
  }

  _extractPublicId(fileUrl) {
    if (!fileUrl) return null;

    const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match) return match[1];

    const parts = fileUrl.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    const pathAfterUpload = parts.slice(uploadIndex + 1);
    if (pathAfterUpload[0] && /^\d+$/.test(pathAfterUpload[0])) {
      pathAfterUpload.shift();
    }

    const lastPart = pathAfterUpload[pathAfterUpload.length - 1];
    if (lastPart.includes(".")) {
      pathAfterUpload[pathAfterUpload.length - 1] = lastPart.split(".")[0];
    }

    return pathAfterUpload.join("/");
  }
}

export default new RetentionService();
