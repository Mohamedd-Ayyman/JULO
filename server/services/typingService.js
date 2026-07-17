import presenceService from "./presenceService.js";
import logger from "../utils/logger.js";

const TYPING_TIMEOUT_MS = 5000;

class TypingService {
  constructor() {
    this._timers = new Map();
  }

  async startTyping(userId, chatId, io) {
    if (!chatId || !userId) return;

    const isMember = await presenceService.isMemberOfChat(userId, chatId);
    if (!isMember) return;

    const payload = { chatId, userId };

    io.to(`chat:${chatId}`).emit("user_typing", payload);

    const timerKey = `${userId}:${chatId}`;

    if (this._timers.has(timerKey)) {
      clearTimeout(this._timers.get(timerKey));
    }

    this._timers.set(timerKey, setTimeout(() => {
      this._timers.delete(timerKey);
      io.to(`chat:${chatId}`).emit("user_stopped_typing", payload);
    }, TYPING_TIMEOUT_MS));
  }

  async startTypingDirect(userId, targetId, chatId, io) {
    if (!chatId || !userId || !targetId) return;

    const payload = { chatId, userId };
    io.to(`user:${targetId}`).emit("user_typing", payload);

    const timerKey = `${userId}:${chatId}`;

    if (this._timers.has(timerKey)) {
      clearTimeout(this._timers.get(timerKey));
    }

    this._timers.set(timerKey, setTimeout(() => {
      this._timers.delete(timerKey);
      io.to(`user:${targetId}`).emit("user_stopped_typing", payload);
    }, TYPING_TIMEOUT_MS));
  }

  async stopTyping(userId, chatId, io) {
    if (!chatId || !userId) return;

    const payload = { chatId, userId };

    io.to(`chat:${chatId}`).emit("user_stopped_typing", payload);

    const timerKey = `${userId}:${chatId}`;
    if (this._timers.has(timerKey)) {
      clearTimeout(this._timers.get(timerKey));
      this._timers.delete(timerKey);
    }
  }

  async stopTypingDirect(userId, targetId, chatId, io) {
    if (!chatId || !userId || !targetId) return;

    const payload = { chatId, userId };
    io.to(`user:${targetId}`).emit("user_stopped_typing", payload);

    const timerKey = `${userId}:${chatId}`;
    if (this._timers.has(timerKey)) {
      clearTimeout(this._timers.get(timerKey));
      this._timers.delete(timerKey);
    }
  }

  async clearOnMessageSent(userId, chatId, io) {
    if (!chatId || !userId) return;

    const timerKey = `${userId}:${chatId}`;
    if (this._timers.has(timerKey)) {
      clearTimeout(this._timers.get(timerKey));
      this._timers.delete(timerKey);
    }

    io.to(`chat:${chatId}`).emit("user_stopped_typing", { chatId, userId });
  }

  clearAllForUser(userId) {
    for (const [key, timer] of this._timers) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timer);
        this._timers.delete(key);
      }
    }
  }
}

export default new TypingService();
