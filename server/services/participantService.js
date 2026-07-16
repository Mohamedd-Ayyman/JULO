import Participant from "../models/participant.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import logger from "../utils/logger.js";

class ParticipantService {
  async addParticipant(chatId, userId, { role = "member", addedBy = null, tenantId = null, nickname = null } = {}) {
    try {
      const chat = await Chat.findById(chatId).lean();
      if (!chat) {
        const err = new Error("Chat not found");
        err.statusCode = 404;
        throw err;
      }

      const existing = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (existing) {
        const err = new Error("User is already a participant");
        err.statusCode = 409;
        throw err;
      }

      const participant = await Participant.create({
        chatId,
        userId,
        role,
        addedBy,
        nickname,
        tenantId,
      });

      if (!chat.members.includes(userId)) {
        await Chat.findByIdAndUpdate(chatId, { $addToSet: { members: userId } });
      }

      logger.info(`[Participant] Added ${userId} to chat ${chatId} as ${role}`);
      return participant;
    } catch (error) {
      logger.error("Error adding participant:", error);
      throw error;
    }
  }

  async addMultipleParticipants(chatId, userIds, { role = "member", addedBy = null, tenantId = null } = {}) {
    try {
      const chat = await Chat.findById(chatId).lean();
      if (!chat) {
        const err = new Error("Chat not found");
        err.statusCode = 404;
        throw err;
      }

      const results = [];
      for (const userId of userIds) {
        const existing = await Participant.findOne({ chatId, userId, isDeleted: false });
        if (!existing) {
          const participant = await Participant.create({
            chatId,
            userId,
            role,
            addedBy,
            tenantId,
          });
          results.push(participant);
        }
      }

      const newMemberIds = results.map((p) => p.userId);
      if (newMemberIds.length > 0) {
        await Chat.findByIdAndUpdate(chatId, { $addToSet: { members: { $each: newMemberIds } } });
      }

      logger.info(`[Participant] Added ${results.length} participants to chat ${chatId}`);
      return results;
    } catch (error) {
      logger.error("Error adding multiple participants:", error);
      throw error;
    }
  }

  async removeParticipant(chatId, userId, removedBy = null) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      if (participant.role === "admin") {
        const adminCount = await Participant.countDocuments({
          chatId,
          role: "admin",
          isDeleted: false,
        });
        if (adminCount <= 1) {
          const err = new Error("Cannot remove the last admin. Promote another member first.");
          err.statusCode = 400;
          throw err;
        }
      }

      participant.isDeleted = true;
      participant.leftAt = new Date();
      await participant.save();

      await Chat.findByIdAndUpdate(chatId, { $pull: { members: userId } });

      logger.info(`[Participant] Removed ${userId} from chat ${chatId}`);
      return participant;
    } catch (error) {
      logger.error("Error removing participant:", error);
      throw error;
    }
  }

  async getParticipant(chatId, userId) {
    return Participant.findOne({ chatId, userId, isDeleted: false });
  }

  async getParticipants(chatId, { page = 1, limit = 50 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [participants, total] = await Promise.all([
      Participant.find({ chatId, isDeleted: false })
        .populate("userId", "firstname lastname email profilepic isOnline lastSeen")
        .populate("addedBy", "firstname lastname")
        .skip(skip)
        .limit(Number(limit))
        .sort({ role: 1, joinedAt: 1 })
        .lean(),
      Participant.countDocuments({ chatId, isDeleted: false }),
    ]);

    return { participants, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getUserChats(userId, { archived = false, page = 1, limit = 50 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [participants, total] = await Promise.all([
      Participant.find({ userId, isDeleted: false, archived })
        .populate({
          path: "chatId",
          populate: [
            { path: "lastMessage", select: "text sender createdAt" },
          ],
        })
        .skip(skip)
        .limit(Number(limit))
        .sort({ pinned: -1, updatedAt: -1 })
        .lean(),
      Participant.countDocuments({ userId, isDeleted: false, archived }),
    ]);

    return { chats: participants, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async updateRole(chatId, userId, newRole, updatedBy) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      const updater = await Participant.findOne({ chatId, userId: updatedBy, isDeleted: false });
      if (!updater || updater.role !== "admin") {
        const err = new Error("Only admins can change roles");
        err.statusCode = 403;
        throw err;
      }

      if (userId === updatedBy && newRole !== "admin") {
        const err = new Error("Admin cannot demote themselves");
        err.statusCode = 400;
        throw err;
      }

      participant.role = newRole;
      await participant.save();

      logger.info(`[Participant] Role updated for ${userId} in chat ${chatId}: ${newRole}`);
      return participant;
    } catch (error) {
      logger.error("Error updating role:", error);
      throw error;
    }
  }

  async setMuted(chatId, userId, muted, mutedUntil = null) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      participant.muted = muted;
      participant.mutedUntil = muted ? mutedUntil : null;
      await participant.save();

      logger.info(`[Participant] ${muted ? "Muted" : "Unmuted"} ${userId} in chat ${chatId}`);
      return participant;
    } catch (error) {
      logger.error("Error setting mute:", error);
      throw error;
    }
  }

  async setArchived(chatId, userId, archived) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      participant.archived = archived;
      await participant.save();

      logger.info(`[Participant] ${archived ? "Archived" : "Unarchived"} chat ${chatId} for ${userId}`);
      return participant;
    } catch (error) {
      logger.error("Error setting archived:", error);
      throw error;
    }
  }

  async setPinned(chatId, userId, pinned) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      participant.pinned = pinned;
      await participant.save();

      logger.info(`[Participant] ${pinned ? "Pinned" : "Unpinned"} chat ${chatId} for ${userId}`);
      return participant;
    } catch (error) {
      logger.error("Error setting pinned:", error);
      throw error;
    }
  }

  async setNickname(chatId, userId, nickname) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      participant.nickname = nickname;
      await participant.save();

      return participant;
    } catch (error) {
      logger.error("Error setting nickname:", error);
      throw error;
    }
  }

  async updateLastRead(chatId, userId, messageId) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) return null;

      participant.lastReadMessageId = messageId;
      participant.lastReadAt = new Date();
      participant.unreadCount = 0;
      await participant.save();

      return participant;
    } catch (error) {
      logger.error("Error updating last read:", error);
      throw error;
    }
  }

  async incrementUnreadCount(chatId, excludeUserId = null) {
    try {
      const query = { chatId, isDeleted: false, muted: false };
      if (excludeUserId) {
        query.userId = { $ne: excludeUserId };
      }

      await Participant.updateMany(query, { $inc: { unreadCount: 1 } });
    } catch (error) {
      logger.error("Error incrementing unread count:", error);
      throw error;
    }
  }

  async setNotifications(chatId, userId, enabled) {
    try {
      const participant = await Participant.findOne({ chatId, userId, isDeleted: false });
      if (!participant) {
        const err = new Error("Participant not found");
        err.statusCode = 404;
        throw err;
      }

      participant.notificationsEnabled = enabled;
      await participant.save();

      return participant;
    } catch (error) {
      logger.error("Error setting notifications:", error);
      throw error;
    }
  }

  async isParticipant(chatId, userId) {
    const count = await Participant.countDocuments({ chatId, userId, isDeleted: false });
    return count > 0;
  }

  async getParticipantCount(chatId) {
    return Participant.countDocuments({ chatId, isDeleted: false });
  }

  async isAdmin(chatId, userId) {
    const participant = await Participant.findOne({ chatId, userId, isDeleted: false, role: "admin" });
    return !!participant;
  }

  async getMutedParticipants(chatId) {
    return Participant.find({
      chatId,
      isDeleted: false,
      muted: true,
      $or: [
        { mutedUntil: null },
        { mutedUntil: { $gt: new Date() } },
      ],
    }).lean();
  }

  async cleanupExpiredMutes() {
    try {
      const result = await Participant.updateMany(
        {
          muted: true,
          mutedUntil: { $ne: null, $lte: new Date() },
        },
        {
          $set: { muted: false, mutedUntil: null },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`[Participant] Cleaned up ${result.modifiedCount} expired mutes`);
      }
      return result.modifiedCount;
    } catch (error) {
      logger.error("Error cleaning up expired mutes:", error);
      throw error;
    }
  }
}

export default new ParticipantService();
