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

    // ── Call session management ─────────────────────────────────────────
    socket.on("call_initiate", async ({ chatId, callType }) => {
      try {
        const { default: callSessionService } = await import("../services/callSessionService.js");
        const { default: Chat } = await import("../models/chat.js");

        const chat = await Chat.findById(chatId).lean();
        if (!chat || !chat.members.some((m) => String(m) === String(socket.userId))) {
          socket.emit("call_error", { message: "Not a member of this chat" });
          return;
        }

        const call = await callSessionService.initiateCall(
          chatId,
          socket.userId,
          null,
          callType || "audio"
        );

        io.to(`chat:${chatId}`).emit("call_invite", {
          callId: call._id,
          initiator: call.initiator,
          callType: call.callType,
          participants: call.participants,
          status: "ringing",
          createdAt: call.createdAt,
        });

        socket.emit("call_initiated", { callId: call._id, status: "ringing" });
      } catch (err) {
        logger.error(`[Socket] call_initiate error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to initiate call" });
      }
    });

    socket.on("call_accept", async ({ callId }) => {
      try {
        const { default: callSessionService } = await import("../services/callSessionService.js");
        const call = await callSessionService.acceptCall(callId, socket.userId);

        io.to(`chat:${call.chatId}`).emit("call_accepted", {
          callId: call._id,
          userId: socket.userId,
          status: "active",
          startedAt: call.startedAt,
        });

        socket.emit("call_accepted_ack", { callId: call._id, status: "active" });
      } catch (err) {
        logger.error(`[Socket] call_accept error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to accept call" });
      }
    });

    socket.on("call_reject", async ({ callId }) => {
      try {
        const { default: callSessionService } = await import("../services/callSessionService.js");
        const call = await callSessionService.rejectCall(callId, socket.userId);

        io.to(`chat:${call.chatId}`).emit("call_rejected", {
          callId: call._id,
          userId: socket.userId,
          status: "rejected",
        });

        socket.emit("call_rejected_ack", { callId: call._id, status: "rejected" });
      } catch (err) {
        logger.error(`[Socket] call_reject error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to reject call" });
      }
    });

    socket.on("call_end", async ({ callId, reason }) => {
      try {
        const { default: callSessionService } = await import("../services/callSessionService.js");
        const call = await callSessionService.endCall(callId, socket.userId, reason);

        io.to(`chat:${call.chatId}`).emit("call_ended", {
          callId: call._id,
          duration: call.duration,
          endReason: call.endReason,
          endedBy: socket.userId,
        });

        socket.emit("call_ended_ack", { callId: call._id, status: "ended" });
      } catch (err) {
        logger.error(`[Socket] call_end error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to end call" });
      }
    });

    socket.on("call_join", async ({ callId }) => {
      try {
        const { default: callSessionService } = await import("../services/callSessionService.js");
        const { default: CallSession } = await import("../models/callSession.js");

        const call = await CallSession.findById(callId);
        if (!call) {
          socket.emit("call_error", { message: "Call not found" });
          return;
        }

        if (call.status === "ended" || call.status === "missed" || call.status === "rejected") {
          socket.emit("call_error", { message: "Call has already ended" });
          return;
        }

        let participant = call.participants.find(
          (p) => String(p.userId) === String(socket.userId)
        );

        if (!participant) {
          const { default: Chat } = await import("../models/chat.js");
          const chat = await Chat.findById(call.chatId).lean();
          if (!chat || !chat.members.some((m) => String(m) === String(socket.userId))) {
            socket.emit("call_error", { message: "Not a member of this chat" });
            return;
          }

          call.participants.push({
            userId: socket.userId,
            joinedAt: new Date(),
            leftAt: null,
            consentToRecording: false,
            consentUpdatedAt: null,
          });
          participant = call.participants[call.participants.length - 1];
        } else if (!participant.joinedAt) {
          participant.joinedAt = new Date();
        } else {
          socket.emit("call_error", { message: "Already in call" });
          return;
        }

        await call.save();

        const populated = await CallSession.findById(callId)
          .populate("participants.userId", "firstname lastname profilepic")
          .lean();

        io.to(`chat:${call.chatId}`).emit("call_participant_joined", {
          callId: call._id,
          userId: socket.userId,
          joinedAt: participant.joinedAt,
          participants: populated.participants,
        });

        socket.emit("call_joined_ack", { callId: call._id, status: call.status });
      } catch (err) {
        logger.error(`[Socket] call_join error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to join call" });
      }
    });

    socket.on("call_leave", async ({ callId }) => {
      try {
        const { default: CallSession } = await import("../models/callSession.js");

        const call = await CallSession.findById(callId);
        if (!call) {
          socket.emit("call_error", { message: "Call not found" });
          return;
        }

        const participant = call.participants.find(
          (p) => String(p.userId) === String(socket.userId)
        );

        if (!participant || !participant.joinedAt) {
          socket.emit("call_error", { message: "Not in this call" });
          return;
        }

        if (!participant.leftAt) {
          participant.leftAt = new Date();
        }

        await call.save();

        io.to(`chat:${call.chatId}`).emit("call_participant_left", {
          callId: call._id,
          userId: socket.userId,
          leftAt: participant.leftAt,
        });

        const activeParticipants = call.participants.filter(
          (p) => p.joinedAt && !p.leftAt
        );

        if (activeParticipants.length === 0 && call.status === "active") {
          const { default: callSessionService } = await import("../services/callSessionService.js");
          const endedCall = await callSessionService.endCall(callId, socket.userId, "normal");

          io.to(`chat:${endedCall.chatId}`).emit("call_ended", {
            callId: endedCall._id,
            duration: endedCall.duration,
            endReason: endedCall.endReason,
            endedBy: socket.userId,
          });
        }

        socket.emit("call_left_ack", { callId: call._id });
      } catch (err) {
        logger.error(`[Socket] call_leave error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to leave call" });
      }
    });

    socket.on("call_mute_toggle", async ({ callId, muted }) => {
      try {
        const { default: CallSession } = await import("../models/callSession.js");

        const call = await CallSession.findById(callId);
        if (!call) {
          socket.emit("call_error", { message: "Call not found" });
          return;
        }

        const participant = call.participants.find(
          (p) => String(p.userId) === String(socket.userId)
        );

        if (!participant || !participant.joinedAt || participant.leftAt) {
          socket.emit("call_error", { message: "Not an active participant in this call" });
          return;
        }

        io.to(`chat:${call.chatId}`).emit("call_mute_updated", {
          callId: call._id,
          userId: socket.userId,
          muted: !!muted,
        });
      } catch (err) {
        logger.error(`[Socket] call_mute_toggle error: ${err.message}`);
        socket.emit("call_error", { message: err.message || "Failed to toggle mute" });
      }
    });

    // ── WebRTC Signaling ──────────────────────────────────────────────
    socket.on("call_offer", async ({ callId, targetUserId, offer }) => {
      if (!callId || !targetUserId || !offer) {
        socket.emit("error", { message: "Missing callId, targetUserId, or offer" });
        return;
      }

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const signalData = await webrtcService.handleOffer(callId, socket.userId, targetUserId, offer);
        io.to(`user:${targetUserId}`).emit("call_offer", signalData);
        logger.debug(`[Socket] call_offer relayed: ${socket.userId} → ${targetUserId}`);
      } catch (err) {
        logger.error(`[Socket] call_offer error: ${err.message}`);
        socket.emit("error", { message: "Failed to relay call offer" });
      }
    });

    socket.on("call_answer", async ({ callId, targetUserId, answer }) => {
      if (!callId || !targetUserId || !answer) {
        socket.emit("error", { message: "Missing callId, targetUserId, or answer" });
        return;
      }

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const signalData = await webrtcService.handleAnswer(callId, socket.userId, targetUserId, answer);
        io.to(`user:${targetUserId}`).emit("call_answer", signalData);
        logger.debug(`[Socket] call_answer relayed: ${socket.userId} → ${targetUserId}`);
      } catch (err) {
        logger.error(`[Socket] call_answer error: ${err.message}`);
        socket.emit("error", { message: "Failed to relay call answer" });
      }
    });

    socket.on("ice_candidate", async ({ callId, targetUserId, candidate }) => {
      if (!callId || !targetUserId || !candidate) {
        socket.emit("error", { message: "Missing callId, targetUserId, or candidate" });
        return;
      }

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const signalData = await webrtcService.handleIceCandidate(callId, socket.userId, targetUserId, candidate);
        io.to(`user:${targetUserId}`).emit("ice_candidate", signalData);
      } catch (err) {
        logger.debug(`[Socket] ice_candidate error: ${err.message}`);
        socket.emit("error", { message: "Failed to relay ICE candidate" });
      }
    });

    socket.on("call_renegotiate", async ({ callId, targetUserId, offer }) => {
      if (!callId || !targetUserId || !offer) {
        socket.emit("error", { message: "Missing callId, targetUserId, or offer" });
        return;
      }

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const signalData = await webrtcService.handleRenegotiate(callId, socket.userId, targetUserId, offer);
        io.to(`user:${targetUserId}`).emit("call_renegotiate", signalData);
        logger.debug(`[Socket] call_renegotiate relayed: ${socket.userId} → ${targetUserId}`);
      } catch (err) {
        logger.error(`[Socket] call_renegotiate error: ${err.message}`);
        socket.emit("error", { message: "Failed to relay renegotiation" });
      }
    });

    socket.on("call_mute", async ({ callId, isMuted }) => {
      if (!callId) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const state = webrtcService.handleMuteToggle(callId, socket.userId, isMuted);
        socket.to(`chat:${callId}`).emit("call_mute", state);
      } catch (err) {
        logger.debug(`[Socket] call_mute error: ${err.message}`);
      }
    });

    socket.on("call_video_toggle", async ({ callId, isVideoOff }) => {
      if (!callId) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const state = webrtcService.handleVideoToggle(callId, socket.userId, isVideoOff);
        socket.to(`chat:${callId}`).emit("call_video_toggle", state);
      } catch (err) {
        logger.debug(`[Socket] call_video_toggle error: ${err.message}`);
      }
    });

    socket.on("call_screen_share_toggle", async ({ callId, isScreenSharing }) => {
      if (!callId) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const state = webrtcService.handleScreenShareToggle(callId, socket.userId, isScreenSharing);
        socket.to(`chat:${callId}`).emit("call_screen_share_toggle", state);
      } catch (err) {
        logger.debug(`[Socket] call_screen_share_toggle error: ${err.message}`);
      }
    });

    socket.on("call_join_session", async ({ callId }) => {
      if (!callId) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const state = webrtcService.handleJoinSession(callId, socket.userId);
        socket.emit("call_media_state", state);
        socket.to(`chat:${callId}`).emit("call_participant_webcam_joined", {
          callId,
          userId: socket.userId,
          timestamp: state.timestamp,
        });
      } catch (err) {
        logger.debug(`[Socket] call_join_session error: ${err.message}`);
      }
    });

    socket.on("call_leave_session", async ({ callId }) => {
      if (!callId) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        const state = webrtcService.handleLeaveSession(callId, socket.userId);
        socket.to(`chat:${callId}`).emit("call_participant_webcam_left", {
          callId,
          userId: socket.userId,
          remainingParticipants: state.remainingParticipants,
          timestamp: state.timestamp,
        });
      } catch (err) {
        logger.debug(`[Socket] call_leave_session error: ${err.message}`);
      }
    });

    socket.on("call_quality_report", async ({ callId, metrics }) => {
      if (!callId || !metrics) return;

      try {
        const { default: webrtcService } = await import("../services/webrtcSignalingService.js");
        webrtcService.handleQualityReport(callId, socket.userId, metrics);
      } catch (err) {
        logger.debug(`[Socket] call_quality_report error: ${err.message}`);
      }
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
