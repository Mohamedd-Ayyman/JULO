import Block from "../models/block.js";
import Report from "../models/report.js";
import Message from "../models/message.js";
import Chat from "../models/chat.js";
import Participant from "../models/participant.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import AuditLog from "../models/auditLog.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";

const SPAM_RATE_LIMIT = 10;
const SPAM_RATE_WINDOW = 30;
const SPAM_REPEAT_THRESHOLD = 3;
const SPAM_REPEAT_WINDOW = 60;

export class ModerationService {
  // ── Blocking ────────────────────────────────────────────────────────────────

  async blockUser(blockerId, blockedId, tenantId = null) {
    if (String(blockerId) === String(blockedId)) {
      const err = new Error("Cannot block yourself");
      err.statusCode = 400;
      throw err;
    }

    const targetUser = await User.findById(blockedId).lean();
    if (!targetUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const existing = await Block.findOne({ blockerId, blockedId });
    if (existing) {
      const err = new Error("User is already blocked");
      err.statusCode = 409;
      throw err;
    }

    const block = await Block.create({ blockerId, blockedId, tenantId });

    try {
      await AuditLog.create({
        userId: blockerId,
        action: "block",
        resource: "block",
        resourceId: block._id,
        tenantId,
        details: { blockedUserId: blockedId },
      });
    } catch (_) {}

    logger.info(`[Moderation] User blocked: ${blockerId} -> ${blockedId}`);
    return block;
  }

  async unblockUser(blockerId, blockedId) {
    const block = await Block.findOneAndDelete({ blockerId, blockedId });
    if (!block) {
      const err = new Error("Block not found");
      err.statusCode = 404;
      throw err;
    }

    try {
      await AuditLog.create({
        userId: blockerId,
        action: "unblock",
        resource: "block",
        resourceId: block._id,
        details: { unblockedUserId: blockedId },
      });
    } catch (_) {}

    logger.info(`[Moderation] User unblocked: ${blockerId} -> ${blockedId}`);
    return { unblocked: true };
  }

  async getBlockedUsers(userId, { page = 1, limit = 50 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [blocks, total] = await Promise.all([
      Block.find({ blockerId: userId })
        .populate("blockedId", "firstname lastname profilepic")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Block.countDocuments({ blockerId: userId }),
    ]);

    return {
      blocks,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getBlockStatus(userId, targetId) {
    const [blockedByMe, blockedMe] = await Promise.all([
      Block.findOne({ blockerId: userId, blockedId: targetId }).lean(),
      Block.findOne({ blockerId: targetId, blockedId: userId }).lean(),
    ]);

    return {
      blocked: !!(blockedByMe || blockedMe),
      blockedByMe: !!blockedByMe,
      blockedMe: !!blockedMe,
    };
  }

  async isBlocked(userId, targetId) {
    const block = await Block.findOne({
      $or: [
        { blockerId: userId, blockedId: targetId },
        { blockerId: targetId, blockedId: userId },
      ],
    }).lean();
    return !!block;
  }

  async getBlockedUserIds(userId) {
    const cacheKey = `blocks:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (_) {}
    }

    const blocks = await Block.find({
      $or: [{ blockerId: userId }, { blockedId: userId }],
    })
      .select("blockerId blockedId")
      .lean();

    const blockedIds = new Set();
    for (const b of blocks) {
      if (String(b.blockerId) === String(userId)) {
        blockedIds.add(String(b.blockedId));
      } else {
        blockedIds.add(String(b.blockerId));
      }
    }

    const ids = [...blockedIds];
    await redis.set(cacheKey, JSON.stringify(ids), 300);
    return ids;
  }

  // ── Reporting ───────────────────────────────────────────────────────────────

  async reportMessage(reporterId, messageId, chatId, reason, description = "", tenantId = null) {
    const message = await Message.findById(messageId).lean();
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    if (String(message.sender) === String(reporterId)) {
      const err = new Error("Cannot report your own message");
      err.statusCode = 400;
      throw err;
    }

    const chat = await Chat.findById(chatId).lean();
    if (!chat || !chat.members.some((m) => String(m) === String(reporterId))) {
      const err = new Error("Not a member of this chat");
      err.statusCode = 403;
      throw err;
    }

    const existing = await Report.findOne({
      reporterId,
      targetType: "message",
      targetId: messageId,
      status: "pending",
    }).lean();
    if (existing) {
      const err = new Error("You have already reported this message");
      err.statusCode = 409;
      throw err;
    }

    const report = await Report.create({
      reporterId,
      targetType: "message",
      targetId: messageId,
      chatId,
      tenantId,
      reason,
      description: description || "",
    });

    try {
      await AuditLog.create({
        userId: reporterId,
        action: "report",
        resource: "message",
        resourceId: messageId,
        tenantId,
        details: { reason, reportId: report._id, targetType: "message" },
      });
    } catch (_) {}

    logger.info(`[Moderation] Message reported: ${messageId} by ${reporterId} (${reason})`);
    return report;
  }

  async reportUser(reporterId, userId, reason, description = "", tenantId = null) {
    if (String(reporterId) === String(userId)) {
      const err = new Error("Cannot report yourself");
      err.statusCode = 400;
      throw err;
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const existing = await Report.findOne({
      reporterId,
      targetType: "user",
      targetId: userId,
      status: "pending",
    }).lean();
    if (existing) {
      const err = new Error("You have already reported this user");
      err.statusCode = 409;
      throw err;
    }

    const report = await Report.create({
      reporterId,
      targetType: "user",
      targetId: userId,
      tenantId,
      reason,
      description: description || "",
    });

    try {
      await AuditLog.create({
        userId: reporterId,
        action: "report",
        resource: "report",
        resourceId: report._id,
        tenantId,
        details: { reason, targetType: "user", targetUserId: userId },
      });
    } catch (_) {}

    logger.info(`[Moderation] User reported: ${userId} by ${reporterId} (${reason})`);
    return report;
  }

  async getReports({ status, reason, targetType, tenantId, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status) query.status = status;
    if (reason) query.reason = reason;
    if (targetType) query.targetType = targetType;
    if (tenantId) query.tenantId = tenantId;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporterId", "firstname lastname profilepic")
        .populate("reviewedBy", "firstname lastname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(query),
    ]);

    const enriched = await this._enrichReports(reports);

    return {
      reports: enriched,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async _enrichReports(reports) {
    const enriched = [];
    for (const r of reports) {
      const item = { ...r };

      if (r.targetType === "message") {
        const msg = await Message.findById(r.targetId)
          .select("text sender chatId deleted spamFlag")
          .populate("sender", "firstname lastname")
          .lean();
        item.targetMessage = msg;
      } else if (r.targetType === "user") {
        const user = await User.findById(r.targetId)
          .select("firstname lastname profilepic role isDeactivated")
          .lean();
        item.targetUser = user;
      }

      enriched.push(item);
    }
    return enriched;
  }

  async reviewReport(reportId, moderatorId, { status, action = "none", actionNote = "" } = {}) {
    const report = await Report.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      throw err;
    }

    if (report.status !== "pending") {
      const err = new Error("Report has already been reviewed");
      err.statusCode = 409;
      throw err;
    }

    report.status = status;
    report.reviewedBy = moderatorId;
    report.reviewedAt = new Date();
    report.action = action;
    report.actionNote = actionNote || "";
    await report.save();

    if (action !== "none") {
      await this._executeAction(report, action, moderatorId);
    }

    try {
      const statusMessages = {
        reviewed: "Your report has been reviewed",
        dismissed: "Your report has been dismissed",
        resolved: "Your report has been resolved — action was taken",
      };
      const notifMessage = statusMessages[status] || "Your report has been updated";

      await Notification.create({
        recipient: report.reporterId,
        sender: moderatorId,
        type: "mention",
        message: notifMessage,
        read: false,
      });
    } catch (_) {}

    try {
      await AuditLog.create({
        userId: moderatorId,
        action: "update",
        resource: "report",
        resourceId: report._id,
        details: { status, action, reportId: report._id, targetType: report.targetType, targetId: report.targetId },
      });
    } catch (_) {}

    logger.info(`[Moderation] Report ${reportId} reviewed by ${moderatorId}: ${status} / ${action}`);
    return report;
  }

  async _executeAction(report, action, moderatorId) {
    switch (action) {
      case "message_deleted": {
        if (report.targetType === "message") {
          const message = await Message.findById(report.targetId);
          if (message) {
            message.deleted = true;
            message.text = "[removed by moderator]";
            await message.save();
            logger.info(`[Moderation] Message ${report.targetId} deleted by moderator`);
          }
        }
        break;
      }
      case "user_muted": {
        const muteUserId = report.targetType === "user"
          ? report.targetId
          : (await Message.findById(report.targetId).lean())?.sender;

        if (muteUserId) {
          if (report.chatId) {
            await Participant.findOneAndUpdate(
              { chatId: report.chatId, userId: muteUserId, isDeleted: false },
              { muted: true, mutedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }
            );
            logger.info(`[Moderation] User ${muteUserId} muted in chat ${report.chatId} for 24h`);
          } else {
            const updated = await Participant.updateMany(
              { userId: muteUserId, isDeleted: false },
              { muted: true, mutedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }
            );
            logger.info(`[Moderation] User ${muteUserId} muted in ${updated.modifiedCount} chats for 24h`);
          }
        }
        break;
      }
      case "user_banned": {
        const targetUserId = report.targetType === "user"
          ? report.targetId
          : (await Message.findById(report.targetId).lean())?.sender;

        if (targetUserId) {
          await User.findByIdAndUpdate(targetUserId, { isDeactivated: true, deactivatedAt: new Date() });

          const userChats = await Chat.find({ members: targetUserId }).select("_id").lean();
          for (const chat of userChats) {
            await Participant.findOneAndUpdate(
              { chatId: chat._id, userId: targetUserId, isDeleted: false },
              { isDeleted: true, leftAt: new Date() }
            );
            await Chat.findByIdAndUpdate(chat._id, { $pull: { members: targetUserId } });
          }

          logger.info(`[Moderation] User ${targetUserId} banned and removed from chats`);
        }
        break;
      }
      case "warning": {
        const warnUserId = report.targetType === "user"
          ? report.targetId
          : (await Message.findById(report.targetId).lean())?.sender;

        if (warnUserId) {
          logger.info(`[Moderation] Warning issued to user ${warnUserId} for report ${report._id}`);
        }
        break;
      }
    }
  }

  async getReportCounts(tenantId = null) {
    const query = {};
    if (tenantId) query.tenantId = tenantId;

    const counts = await Report.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { pending: 0, reviewed: 0, dismissed: 0, resolved: 0, total: 0 };
    for (const c of counts) {
      result[c._id] = c.count;
      result.total += c.count;
    }
    return result;
  }

  // ── Spam Detection ──────────────────────────────────────────────────────────

  async checkSpamRateLimit(userId, chatId) {
    const key = `spam:${chatId}:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, SPAM_RATE_WINDOW);
    }

    if (count > SPAM_RATE_LIMIT) {
      return { isSpam: true, reason: "rate_limit", count };
    }
    return { isSpam: false, count };
  }

  async checkRepeatedText(userId, chatId, text) {
    if (!text || text.length < 5) return { isSpam: false };

    const key = `spam:text:${chatId}:${userId}`;
    const lastText = await redis.get(key);

    if (lastText === text) {
      const repeatKey = `spam:repeat:${chatId}:${userId}`;
      const repeatCount = await redis.incr(repeatKey);
      if (repeatCount === 1) {
        await redis.expire(repeatKey, SPAM_REPEAT_WINDOW);
      }

      if (repeatCount >= SPAM_REPEAT_THRESHOLD) {
        return { isSpam: true, reason: "repeated_text", repeatCount };
      }
    } else {
      await redis.set(key, text, SPAM_REPEAT_WINDOW);
      await redis.del(`spam:repeat:${chatId}:${userId}`);
    }

    return { isSpam: false };
  }

  async applySpamFlags(message, spamResults) {
    if (!spamResults || spamResults.length === 0) return message;

    const reasons = spamResults.filter((r) => r.isSpam).map((r) => r.reason);
    if (reasons.length === 0) return message;

    message.spamFlag = true;
    message.spamScore = reasons.length;
    message.spamReasons = reasons;
    await message.save();

    logger.info(`[Moderation] Message ${message._id} flagged as spam: ${reasons.join(", ")}`);
    return message;
  }

  async checkContentSpam(text) {
    if (!text || text.length < 5) return { isSpam: false };

    const reasons = [];

    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = text.match(urlPattern);
    if (urls && urls.length >= 3) {
      reasons.push("excessive_urls");
    }

    const shortUrlPattern = /bit\.ly|tinyurl|goo\.gl|t\.co|is\.gd|buff\.ly|ow\.ly/i;
    if (shortUrlPattern.test(text)) {
      reasons.push("shortened_url");
    }

    const stripped = text.replace(/https?:\/\/[^\s]+/g, "").replace(/\s+/g, "");
    if (stripped.length >= 10) {
      const upperCount = (stripped.match(/[A-Z]/g) || []).length;
      const alphaCount = (stripped.match(/[a-zA-Z]/g) || []).length;
      if (alphaCount >= 10 && upperCount / alphaCount > 0.7) {
        reasons.push("excessive_caps");
      }
    }

    const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
    const emojis = text.match(emojiPattern);
    if (emojis && emojis.length > 10) {
      reasons.push("excessive_emojis");
    }

    if (reasons.length === 0) return { isSpam: false };
    return { isSpam: true, reason: reasons.join(","), reasons };
  }
}

export default new ModerationService();
