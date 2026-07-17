import User from "../models/user.js";
import Chat from "../models/chat.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";

const SOCKETS_PREFIX = "sockets:";
const ONLINE_BROADCAST_KEY = "presence:broadcast";
const USER_CHATS_PREFIX = "user_chats:";

class PresenceService {
  async trackSocket(userId, socketId) {
    if (!redis.ready) return;
    try {
      await redis.client.hset(`${SOCKETS_PREFIX}${userId}`, socketId, JSON.stringify({
        connectedAt: new Date().toISOString(),
      }));
    } catch (err) {
      logger.debug(`[Presence] trackSocket failed for ${userId}`, { error: err.message });
    }
  }

  async removeSocket(userId, socketId) {
    if (!redis.ready) return 0;
    try {
      await redis.client.hdel(`${SOCKETS_PREFIX}${userId}`, socketId);
      return await redis.client.hlen(`${SOCKETS_PREFIX}${userId}`);
    } catch (err) {
      logger.debug(`[Presence] removeSocket failed for ${userId}`, { error: err.message });
      return 0;
    }
  }

  async setOnline(userId, isOnline) {
    try {
      const update = { isOnline };
      if (!isOnline) update.lastSeen = new Date();
      await User.findByIdAndUpdate(userId, update);
    } catch (err) {
      logger.debug(`[Presence] setOnline failed for ${userId}`, { error: err.message });
    }
  }

  async shouldBroadcast(userId) {
    if (!redis.ready) return true;
    try {
      const already = await redis.client.sismember(ONLINE_BROADCAST_KEY, userId);
      return !already;
    } catch {
      return true;
    }
  }

  async markBroadcast(userId) {
    if (!redis.ready) return;
    try {
      await redis.client.sadd(ONLINE_BROADCAST_KEY, userId);
    } catch {}
  }

  async clearBroadcast(userId) {
    if (!redis.ready) return;
    try {
      await redis.client.srem(ONLINE_BROADCAST_KEY, userId);
    } catch {}
  }

  async cacheUserChats(userId, chatIds) {
    if (!redis.ready) return;
    try {
      await redis.client.set(`${USER_CHATS_PREFIX}${userId}`, JSON.stringify(chatIds));
    } catch {}
  }

  async getCachedUserChats(userId) {
    if (!redis.ready) return null;
    try {
      const raw = await redis.client.get(`${USER_CHATS_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async clearUserChats(userId) {
    if (!redis.ready) return;
    try {
      await redis.client.del(`${USER_CHATS_PREFIX}${userId}`);
    } catch {}
  }

  async getChatMemberIds(userId) {
    try {
      const chats = await Chat.find({ members: userId }).select("members").lean();
      const memberIds = new Set();
      chats.forEach((chat) => {
        chat.members.forEach((m) => {
          const id = String(m);
          if (id !== String(userId)) memberIds.add(id);
        });
      });
      return [...memberIds];
    } catch (err) {
      logger.debug(`[Presence] getChatMemberIds failed for ${userId}: ${err.message}`);
      return [];
    }
  }

  async isMemberOfChat(userId, chatId) {
    const cached = await this.getCachedUserChats(userId);
    if (cached) return cached.includes(String(chatId));

    try {
      const chat = await Chat.findById(chatId).select("members").lean();
      if (!chat) return false;
      return chat.members.some((m) => String(m) === String(userId));
    } catch {
      return false;
    }
  }

  async broadcastPresence(userId, isOnline, io) {
    const should = await this.shouldBroadcast(userId);
    if (!should) return;

    await this.markBroadcast(userId);

    try {
      const user = await User.findById(userId).select("showOnlineStatus").lean();
      const memberIds = await this.getChatMemberIds(userId);
      if (memberIds.length === 0) return;

      const event = isOnline ? "user_online" : "user_offline";
      const payload = { userId, timestamp: new Date() };

      for (const id of memberIds) {
        const targetUser = user?.showOnlineStatus !== false ? payload : { ...payload, hidden: true };
        if (user?.showOnlineStatus !== false || !isOnline) {
          io.to(`user:${id}`).emit(event, targetUser);
        }
      }
    } catch (err) {
      logger.debug(`[Presence] broadcastPresence failed for ${userId}: ${err.message}`);
    }
  }

  async getPresence(userId) {
    try {
      if (redis.ready) {
        const sockets = await redis.client.hlen(`${SOCKETS_PREFIX}${userId}`);
        if (sockets > 0) return { isOnline: true, lastSeen: null };
      }

      const user = await User.findById(userId).select("isOnline lastSeen showOnlineStatus").lean();
      if (!user) return { isOnline: false, lastSeen: null };

      return {
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        showOnlineStatus: user.showOnlineStatus,
      };
    } catch (err) {
      logger.debug(`[Presence] getPresence failed for ${userId}: ${err.message}`);
      return { isOnline: false, lastSeen: null };
    }
  }

  async getBulkPresence(userIds) {
    if (!userIds || userIds.length === 0) return {};

    const results = {};
    const missedIds = [];

    if (redis.ready) {
      try {
        const pipeline = redis.client.pipeline();
        for (const id of userIds) {
          pipeline.hlen(`${SOCKETS_PREFIX}${id}`);
        }
        const responses = await pipeline.exec();

        for (let i = 0; i < userIds.length; i++) {
          const count = responses[i]?.[1] ?? 0;
          if (count > 0) {
            results[userIds[i]] = { isOnline: true, lastSeen: null };
          } else {
            missedIds.push(userIds[i]);
          }
        }
      } catch {
        missedIds.push(...userIds);
      }
    } else {
      missedIds.push(...userIds);
    }

    if (missedIds.length > 0) {
      try {
        const users = await User.find({ _id: { $in: missedIds } })
          .select("isOnline lastSeen showOnlineStatus")
          .lean();

        for (const user of users) {
          results[String(user._id)] = {
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            showOnlineStatus: user.showOnlineStatus,
          };
        }

        for (const id of missedIds) {
          if (!results[id]) {
            results[id] = { isOnline: false, lastSeen: null };
          }
        }
      } catch (err) {
        logger.debug(`[Presence] getBulkPresence DB fallback failed`, { error: err.message });
      }
    }

    return results;
  }
}

export default new PresenceService();
