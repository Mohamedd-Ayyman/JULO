import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

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
    // Allow long polling fallback for unreliable connections
    allowUpgrades: true,
    perMessageDeflate: false,
  };

  io = new Server(httpServer, ioOptions);

  // ── Redis adapter — only when Redis is fully ready ──────────────────────
  if (redis.ready) {
    try {
      // ioredis.duplicate() creates a fresh client sharing the connection pool
      const pubClient = redis.client.duplicate();
      const subClient = redis.client.duplicate();

      // Connect duplicates (they start disconnected)
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

      // Use adapter only if both clients connected successfully
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

    // Track socket in Redis (for presence) — non-fatal if Redis is unavailable
    if (redis.ready) {
      try {
        await redis.client.hset(`sockets:${socket.userId}`, socket.id, JSON.stringify({
          connectedAt: new Date().toISOString(),
          requestId,
        }));
      } catch (err) {
        logger.debug(`[Socket] Redis presence update failed for ${socket.userId}`, { error: err.message });
      }
    }

    logger.info(`[Socket] Connected: ${socket.userId} (${socket.id})`, { requestId });

    // ── Chat rooms ─────────────────────────────────────────────────────
    socket.on("join_chat", async (chatId) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} joined chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`[Socket] ${socket.userId} left chat:${chatId}`);
    });

    // ── Real-time message ──────────────────────────────────────────────
    socket.on("send_message", async ({ chatId, text, receiverId }) => {
      logger.debug(`[Socket] send_message from ${socket.userId} to chat:${chatId}`, { requestId });

      socket.to(`chat:${chatId}`).emit("receive_message", {
        chatId,
        senderId: socket.userId,
        text,
        createdAt: new Date(),
        requestId,
      });

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

    // ── Typing indicators ───────────────────────────────────────────────
    socket.on("typing_start", ({ chatId, receiverId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_typing", { chatId, userId: socket.userId });
      if (receiverId) io.to(`user:${receiverId}`).emit("user_typing", { chatId, userId: socket.userId });
    });

    socket.on("typing_stop", ({ chatId, receiverId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_stopped_typing", { chatId, userId: socket.userId });
      if (receiverId) io.to(`user:${receiverId}`).emit("user_stopped_typing", { chatId, userId: socket.userId });
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

      if (redis.ready) {
        try {
          await redis.client.hdel(`sockets:${socket.userId}`, socket.id);
          const remaining = await redis.client.hlen(`sockets:${socket.userId}`);
          if (remaining === 0) {
            try {
              const { default: User } = await import("../models/user.js");
              await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
            } catch (err) {
              logger.debug("[Socket] Failed to update user offline status", { error: err.message });
            }
          }
        } catch (err) {
          logger.debug(`[Socket] Redis cleanup failed for ${socket.userId}`, { error: err.message });
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