import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import presenceService from "../services/presenceService.js";
import typingService from "../services/typingService.js";

let io;

/**
 * Build Socket.IO server with optional Redis adapter for horizontal scaling.
 * Adapter is only activated when Redis is fully ready — otherwise runs
 * single-instance without Redis pub/sub (Socket.IO works fine without it).
 */
export async function initSocket(httpServer) {
  const ioOptions = {
    cors: {
      origin: config.clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60_000,
    pingInterval: 25_000,
    allowUpgrades: true,
    perMessageDeflate: false,
  };

  io = new Server(httpServer, ioOptions);

  // ── Redis adapter — only when Redis is fully ready ──────────────────────
  if (redis.ready) {
    try {
      const pubClient = redis.client.duplicate();
      const subClient = redis.client.duplicate();

      await Promise.all([
        pubClient.connect().catch((err) => {
          logger.warn("[Socket] Pub client connect failed", { error: err.message });
          return null;
        }),
        subClient.connect().catch((err) => {
          logger.warn("[Socket] Sub client connect failed", { error: err.message });
          return null;
        }),
      ]);

      if (pubClient.status === "ready" && subClient.status === "ready") {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("[Socket] Redis adapter active — multi-instance support enabled");
      } else {
        logger.warn("[Socket] Redis adapter NOT active — single-instance mode");
      }
    } catch (err) {
      logger.warn("[Socket] Redis adapter setup failed — single-instance mode", { error: err.message });
    }
  } else {
    logger.warn("[Socket] Redis not ready — running in single-instance mode (no Redis adapter)");
  }

  // ── Auth middleware ───────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Authentication error: no token"));

      const decoded = jwt.verify(token, config.secretKey);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Authentication error: invalid token"));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const requestId = uuidv4();
    socket.requestId = requestId;
    socket.join(`user:${socket.userId}`);

    // Track socket in Redis (for presence)
    await presenceService.trackSocket(socket.userId, socket.id);

    logger.info(`[Socket] Connected: ${socket.userId} (${socket.id})`, { requestId });

    // ── Auto-join chat rooms + track user chats ─────────────────────────
    try {
      const { default: Chat } = await import("../models/chat.js");
      const chats = await Chat.find({ members: socket.userId }).select("_id").lean();
      const chatIds = chats.map((c) => String(c._id));
      chatIds.forEach((chatId) => socket.join(`chat:${chatId}`));
      await presenceService.cacheUserChats(socket.userId, chatIds);
    } catch (err) {
      logger.debug(`[Socket] Auto-join failed for ${socket.userId}: ${err.message}`);
    }

    // ── Presence: broadcast online to contacts ──────────────────────────
    await presenceService.broadcastPresence(socket.userId, true, io);

    // ── Chat rooms ─────────────────────────────────────────────────────
    socket.on("join_chat", async (chatId) => {
      try {
        const { default: Chat } = await import("../models/chat.js");
        const chat = await Chat.findById(chatId).lean();
        if (!chat || !chat.members.some((m) => String(m) === String(socket.userId))) {
          socket.emit("error", { message: "Not a member of this chat" });
          return;
        }
        socket.join(`chat:${chatId}`);
        logger.debug(`[Socket] ${socket.userId} joined chat:${chatId}`);
      } catch (err) {
        logger.error(`[Socket] join_chat error: ${err.message}`);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} left chat:${chatId}`);
    });

    // ── Real-time message ──────────────────────────────────────────────
    socket.on("send_message", async ({ chatId, text, receiverId, encryptedContent, iv, authTag, keyId, ephemeralPublicKey, ratchetStep, messageType, tempId }) => {
      logger.debug(`[Socket] send_message from ${socket.userId} to chat:${chatId}`, { requestId });

      try {
        const { default: Chat } = await import("../models/chat.js");
        const chat = await Chat.findById(chatId).lean();
        if (!chat || !chat.members.some((m) => String(m) === String(socket.userId))) {
          socket.emit("error", { message: "Not a member of this chat" });
          return;
        }

        const messagePayload = {
          chatId,
          senderId: socket.userId,
          text,
          encryptedContent,
          iv,
          authTag,
          keyId,
          ephemeralPublicKey,
          ratchetStep,
          messageType,
          tempId,
          status: "sent",
          createdAt: new Date(),
          requestId,
        };

        socket.to(`chat:${chatId}`).emit("receive_message", messagePayload);

        if (receiverId) {
          io.to(`user:${receiverId}`).emit("receive_message", messagePayload);
        }

        await typingService.clearOnMessageSent(socket.userId, chatId, io);
      } catch (err) {
        logger.error(`[Socket] send_message error: ${err.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── Message delivery acknowledgment ────────────────────────────────
    socket.on("message_delivered", async ({ messageId, chatId }) => {
      if (!messageId || !chatId) return;

      try {
        const { default: chatService } = await import("../services/chatService.js");
        const message = await chatService.markDelivered(messageId, socket.userId);
        const msgObj = message.toObject ? message.toObject() : message;

        io.to(`user:${msgObj.sender}`).emit("delivery_confirmed", {
          messageId,
          chatId,
          deliveredTo: socket.userId,
          deliveredAt: new Date(),
          status: msgObj.status,
        });
      } catch (err) {
        logger.debug(`[Socket] message_delivered error: ${err.message}`);
      }
    });

    // ── Read receipts via socket ────────────────────────────────────────
    socket.on("mark_read", async ({ chatId, lastMessageId }) => {
      if (!chatId) return;

      try {
        const { default: chatService } = await import("../services/chatService.js");
        await chatService.markRead(chatId, socket.userId);

        const { default: Message } = await import("../models/message.js");
        const lastMsg = lastMessageId || (await Message.findOne({ chatId }).sort({ createdAt: -1 }).lean())?._id;

        socket.to(`chat:${chatId}`).emit("messages_read", {
          chatId,
          userId: socket.userId,
          readUpTo: lastMsg,
          readAt: new Date(),
        });
      } catch (err) {
        logger.debug(`[Socket] mark_read error: ${err.message}`);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────
    socket.on("typing_start", ({ chatId, receiverId, userId }) => {
      const targetId = receiverId || userId;

      typingService.startTyping(socket.userId, chatId, io);

      if (targetId && targetId !== socket.userId) {
        typingService.startTypingDirect(socket.userId, targetId, chatId, io);
      }
    });

    socket.on("typing_stop", ({ chatId, receiverId, userId }) => {
      const targetId = receiverId || userId;

      typingService.stopTyping(socket.userId, chatId, io);

      if (targetId && targetId !== socket.userId) {
        typingService.stopTypingDirect(socket.userId, targetId, chatId, io);
      }
    });

    // ── Last Seen query ───────────────────────────────────────────────
    socket.on("get_last_seen", async ({ targetUserId }) => {
      if (!targetUserId) return;

      try {
        const { default: User } = await import("../models/user.js");
        const user = await User.findById(targetUserId)
          .select("isOnline lastSeen showOnlineStatus")
          .lean();

        if (!user) {
          socket.emit("last_seen_response", { targetUserId, error: "User not found" });
          return;
        }

        const visible = user.showOnlineStatus !== false;
        socket.emit("last_seen_response", {
          targetUserId,
          isOnline: visible ? user.isOnline : false,
          lastSeen: visible ? user.lastSeen : null,
          showOnlineStatus: visible,
        });
      } catch (err) {
        logger.debug(`[Socket] get_last_seen error: ${err.message}`);
      }
    });

    // ── E2E Key Exchange ────────────────────────────────────────────────
    socket.on("key_exchange", ({ recipientId, bundle }) => {
      if (!recipientId || !bundle) {
        socket.emit("error", { message: "Missing recipientId or bundle" });
        return;
      }
      io.to(`user:${recipientId}`).emit("key_exchange", {
        senderId: socket.userId,
        bundle,
      });
      logger.debug(`[Socket] key_exchange from ${socket.userId} to ${recipientId}`);
    });

    socket.on("key_rotation", ({ recipientId, newBundle }) => {
      if (!recipientId || !newBundle) {
        socket.emit("error", { message: "Missing recipientId or newBundle" });
        return;
      }
      io.to(`user:${recipientId}`).emit("key_rotation", {
        senderId: socket.userId,
        newBundle,
      });
      logger.debug(`[Socket] key_rotation from ${socket.userId} to ${recipientId}`);
    });

    // ── Presence sync ───────────────────────────────────────────────────
    socket.on("sync_presence", () => {
      socket.emit("presence_sync", {
        userId: socket.userId,
        isOnline: true,
        syncedAt: new Date().toISOString(),
      });
    });

    // ── Disconnect ─────────────────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      logger.info(`[Socket] Disconnected: ${socket.userId} (${reason})`, { requestId });

      typingService.clearAllForUser(socket.userId);

      const remaining = await presenceService.removeSocket(socket.userId, socket.id);

      if (remaining === 0) {
        await presenceService.clearBroadcast(socket.userId);
        await presenceService.setOnline(socket.userId, false);
        await presenceService.broadcastPresence(socket.userId, false, io);
        await presenceService.clearUserChats(socket.userId);
      }
    });
  });

  return io;
}

/** Emit a notification to a specific user across all their sockets. */
export async function emitToUser(userId, event, data) {
  if (!io) throw new Error("Socket.io not initialized");
  io.to(`user:${userId}`).emit(event, data);
}

/** Broadcast an event to a chat room. */
export async function emitToChat(chatId, event, data) {
  if (!io) throw new Error("Socket.io not initialized");
  io.to(`chat:${chatId}`).emit(event, data);
}

/** Broadcast to multiple users. */
export async function emitToUsers(userIds, event, data) {
  if (!io) throw new Error("Socket.io not initialized");
  userIds.forEach((id) => io.to(`user:${id}`).emit(event, data));
}

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
