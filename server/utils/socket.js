import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

let io;

/**
 * Build Socket.IO server with Redis adapter for horizontal scaling.
 * Each instance subscribes to a shared Redis pub/sub channel, enabling
 * real-time events to route correctly across multiple server instances.
 */
export async function initSocket(server) {
  const ioOptions = {
    cors: {
      origin: config.clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  };

  // Use Redis adapter only when Redis is available
  if (redis.ready) {
    const pubClient = redis.client.duplicate();
    const subClient = redis.client.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    io = new Server(server, ioOptions);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("[Socket] Redis adapter enabled — multi-instance support active");
  } else {
    io = new Server(server, ioOptions);
    logger.warn("[Socket] No Redis — running in single-instance mode");
  }

  // ── Auth middleware ───────────────────────────────────────────────────────
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

  // ── Connection handler ────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const requestId = uuidv4();
    socket.requestId = requestId;
    socket.join(`user:${socket.userId}`);

    // Track socket in Redis (for presence + routing)
    if (redis.ready) {
      await redis.client.hset(`sockets:${socket.userId}`, socket.id, JSON.stringify({
        connectedAt: new Date().toISOString(),
        requestId,
      }));
    }

    logger.info(`[Socket] Connected: ${socket.userId} (${socket.id})`, { requestId });

    // ── Chat rooms ─────────────────────────────────────────────────────────
    socket.on("join_chat", async (chatId) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} joined chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} left chat:${chatId}`);
    });

    // ── Real-time message ─────────────────────────────────────────────────
    socket.on("send_message", async ({ chatId, text, receiverId }) => {
      logger.debug(`[Socket] send_message from ${socket.userId} to chat:${chatId}`, { requestId });

      // Broadcast to chat room (all instances via Redis adapter)
      socket.to(`chat:${chatId}`).emit("receive_message", {
        chatId,
        senderId: socket.userId,
        text,
        createdAt: new Date(),
        requestId,
      });

      // Direct emit to receiver if specified
      if (receiverId) {
        io.to(`user:${receiverId}`).emit("receive_message", {
          chatId,
          senderId: socket.userId,
          text,
          createdAt: new Date(),
          requestId,
        });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on("typing_start", ({ chatId, receiverId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_typing", { chatId, userId: socket.userId });
      if (receiverId) io.to(`user:${receiverId}`).emit("user_typing", { chatId, userId: socket.userId });
    });

    socket.on("typing_stop", ({ chatId, receiverId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_stopped_typing", { chatId, userId: socket.userId });
      if (receiverId) io.to(`user:${receiverId}`).emit("user_stopped_typing", { chatId, userId: socket.userId });
    });

    // ── Presence sync ─────────────────────────────────────────────────────
    socket.on("sync_presence", () => {
      socket.emit("presence_sync", {
        userId: socket.userId,
        isOnline: true,
        syncedAt: new Date().toISOString(),
      });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      logger.info(`[Socket] Disconnected: ${socket.userId} (${reason})`, { requestId });

      // Remove from Redis presence map
      if (redis.ready) {
        await redis.client.hdel(`sockets:${socket.userId}`, socket.id);
        // If no more sockets for this user, mark offline
        const remaining = await redis.client.hlen(`sockets:${socket.userId}`);
        if (remaining === 0) {
          // Import lazily to avoid circular deps
          try {
            const { default: User } = await import("../models/user.js");
            await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
          } catch {}
        }
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

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};