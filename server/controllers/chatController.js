import express from "express";
import chatService from "../services/chatService.js";
import notificationService from "../services/notificationService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, chatCreateSchema, chatUpdateSchema, messageSchema, messageEditSchema, messageQuerySchema, conversationListQuerySchema, messageReplySchema, messageForwardSchema, deliveryAckSchema, batchDeliveryAckSchema, mentionSearchQuerySchema, mentionedMessagesQuerySchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";
import { emitToChat, emitToUsers, emitToUser, getIO } from "../utils/socket.js";
import typingService from "../services/typingService.js";

const router = express.Router();

router.post(
  "/create-new-chat",
  requireAuth,
  tenantMiddleware,
  validate(chatCreateSchema),
  asyncHandler(async (req, res) => {
    const { members, type, name, description, icon } = req.body;
    const chat = await chatService.createOrFind(req.user.userId, req.tenantId, members, { type, name, description, icon });

    try {
      emitToChat(String(chat._id), "chat_created", {
        chat: { _id: chat._id, type: chat.type, name: chat.name, members: chat.members },
        addedBy: req.user.userId,
        createdAt: chat.createdAt,
      });
      if (chat.members && chat.members.length > 0) {
        const otherMemberIds = chat.members
          .filter((m) => String(m) !== String(req.user.userId))
          .map(String);
        if (otherMemberIds.length > 0) {
          emitToUsers(otherMemberIds, "chat_invitation", {
            chatId: chat._id,
            chatName: chat.name,
            chatType: chat.type,
            addedBy: req.user.userId,
          });
        }
      }
    } catch (_) {}

    res.status(201).send({ success: true, data: chat, statusCode: 201 });
  })
);

router.get(
  "/get-all-user-chats",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = conversationListQuerySchema.safeParse(req.query);
    const params = parsed.success ? parsed.data : { page: 1, limit: 20, archived: false };

    const result = await chatService.getAllForUser(req.user.userId, req.tenantId, {
      page: params.page,
      limit: params.limit,
      type: params.type,
      archived: params.archived,
      search: params.search,
    });

    res.send({
      success: true,
      data: result.conversations,
      total: result.total,
      page: result.page,
      pages: result.pages,
      totalUnread: result.totalUnread,
      statusCode: 200,
    });
  })
);

router.put(
  "/mark-read",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await chatService.markRead(req.body.chatId, req.user.userId);

    try {
      emitToChat(req.body.chatId, "messages_read", {
        chatId: req.body.chatId,
        userId: req.user.userId,
        readAt: new Date(),
      });
    } catch (_) {}

    res.send({ success: true, message: "Messages marked as read", statusCode: 200 });
  })
);

router.post(
  "/new-message",
  requireAuth,
  tenantMiddleware,
  idempotencyMiddleware(),
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.sendMessage(req.body.chatId, req.user.userId, req.tenantId, req.body);
    await invalidateCache(`chat:${req.body.chatId}:*`);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(req.body.chatId, "receive_message", {
        ...msgObj,
        senderId: req.user.userId,
        tempId: req.body.tempId || null,
      });

      // Also deliver to each recipient's personal room so messages arrive in
      // real time even if the recipient isn't currently joined to the chat room.
      try {
        const { default: Chat } = await import("../models/chat.js");
        const chatDoc = await Chat.findById(req.body.chatId).lean();
        if (chatDoc?.members?.length) {
          const payload = {
            ...msgObj,
            senderId: req.user.userId,
            tempId: req.body.tempId || null,
          };
          for (const m of chatDoc.members) {
            const mid = String(m);
            if (mid !== String(req.user.userId)) emitToUser(mid, "receive_message", payload);
          }
        }
      } catch (_) {}

      const io = getIO();
      await typingService.clearOnMessageSent(req.user.userId, req.body.chatId, io);

      if (Array.isArray(msgObj.mentions) && msgObj.mentions.length > 0) {
        const mentionedUserIds = msgObj.mentions
          .map((m) => String(typeof m === "object" ? m._id || m : m))
          .filter((id) => id !== String(req.user.userId));

        for (const mentionedId of mentionedUserIds) {
          const notif = await notificationService.create(
            mentionedId, req.user.userId, req.tenantId, "chat_mention",
            { chat: req.body.chatId, messageId: msgObj._id, message: "mentioned you in a message" }
          );
          emitToUser(mentionedId, "notification", { type: "chat_mention", notification: notif });
          emitToUser(mentionedId, "user_mentioned", {
            chatId: req.body.chatId,
            messageId: msgObj._id,
            mentionedBy: req.user.userId,
            text: msgObj.text,
          });
        }
      }
    } catch (_) {}

    res.status(201).send({ success: true, message: "Message sent", data: message, statusCode: 201 });
  })
);

router.get(
  "/retrieve-chat/:chatId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { cursor, limit, direction } = req.query;
    const result = await chatService.getMessages(req.params.chatId, req.user.userId, { cursor, limit, direction });
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.get(
  "/retrieve-chat/:chatId/threads/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await chatService.getThreadReplies(req.params.messageId, req.user.userId, req.query);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.put(
  "/update-chat/:chatId",
  requireAuth,
  validate(chatUpdateSchema),
  asyncHandler(async (req, res) => {
    const chat = await chatService.updateChat(req.params.chatId, req.user.userId, req.body);

    try {
      emitToChat(req.params.chatId, "chat_updated", {
        chatId: req.params.chatId,
        changes: req.body,
        updatedBy: req.user.userId,
      });
    } catch (_) {}

    res.send({ success: true, data: chat, statusCode: 200 });
  })
);

router.put(
  "/pin-message/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await chatService.pinMessage(req.params.messageId, req.user.userId);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(String(msgObj.chatId), "message_pinned", {
        messageId: req.params.messageId,
        chatId: String(msgObj.chatId),
        pinned: msgObj.pinned,
        pinnedBy: msgObj.pinnedBy,
      });
    } catch (_) {}

    res.send({ success: true, data: message, statusCode: 200 });
  })
);

router.get(
  "/pinned-messages/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await chatService.getPinnedMessages(req.params.chatId, req.user.userId, req.query);
    res.send({ success: true, data: result.messages, total: result.total, statusCode: 200 });
  })
);

router.post(
  "/forward-message",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { messageId, targetChatId } = req.body;
    if (!messageId || !targetChatId) {
      return res.status(400).json({ success: false, message: "messageId and targetChatId are required", statusCode: 400 });
    }
    const message = await chatService.forwardMessage(messageId, targetChatId, req.user.userId);

    try {
      emitToChat(targetChatId, "receive_message", {
        ...message.toObject(),
        senderId: req.user.userId,
        forwarded: true,
      });
    } catch (_) {}

    res.status(201).send({ success: true, data: message, statusCode: 201 });
  })
);

router.put(
  "/archive-chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await chatService.archiveChat(req.params.chatId, req.user.userId);
    res.send({ success: true, message: "Chat archived", statusCode: 200 });
  })
);

router.put(
  "/unarchive-chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await chatService.unarchiveChat(req.params.chatId, req.user.userId);
    res.send({ success: true, message: "Chat unarchived", statusCode: 200 });
  })
);

router.delete(
  "/delete-chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const chat = (await import("../models/chat.js")).default;
    const chatData = await chat.findById(req.params.chatId).lean().catch(() => null);

    await chatService.deleteChat(req.params.chatId, req.user.userId);

    try {
      if (chatData && chatData.members) {
        emitToChat(req.params.chatId, "chat_deleted", {
          chatId: req.params.chatId,
          deletedBy: req.user.userId,
        });
      }
    } catch (_) {}

    res.send({ success: true, message: "Chat deleted", statusCode: 200 });
  })
);

// ── Consolidated Message CRUD ──────────────────────────────────────────────────

router.get(
  "/:chatId/messages",
  requireAuth,
  tenantMiddleware,
  validate(messageQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { cursor, limit, direction, includeDeleted, messageType, search } = req.query;
    const result = await chatService.getMessages(req.params.chatId, req.user.userId, {
      cursor: cursor || undefined,
      limit,
      direction: direction || "backward",
      includeDeleted,
      messageType,
      search,
    });
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.put(
  "/:chatId/messages/:messageId/edit",
  requireAuth,
  tenantMiddleware,
  validate(messageEditSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.editMessage(req.params.messageId, req.user.userId, req.body.text);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(req.params.chatId, "message_edited", {
        messageId: req.params.messageId,
        chatId: req.params.chatId,
        text: msgObj.text,
        edited: true,
        editedAt: msgObj.updatedAt,
      });
    } catch (_) {}

    res.send({ success: true, message: "Message updated", data: message, statusCode: 200 });
  })
);

router.delete(
  "/:chatId/messages/:messageId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const Message = (await import("../models/message.js")).default;
    const msgData = await Message.findById(req.params.messageId).lean().catch(() => null);

    await chatService.deleteMessage(req.params.messageId, req.user.userId);

    try {
      if (msgData) {
        emitToChat(req.params.chatId, "message_deleted", {
          messageId: req.params.messageId,
          chatId: req.params.chatId,
          deletedBy: req.user.userId,
        });
      }
    } catch (_) {}

    res.send({ success: true, message: "Message deleted", statusCode: 200 });
  })
);

router.put(
  "/:chatId/messages/:messageId/restore",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const message = await chatService.restoreMessage(req.params.messageId, req.user.userId);

    try {
      emitToChat(req.params.chatId, "message_restored", {
        messageId: req.params.messageId,
        chatId: req.params.chatId,
        restoredBy: req.user.userId,
      });
    } catch (_) {}

    res.send({ success: true, data: message, statusCode: 200 });
  })
);

router.put(
  "/:chatId/messages/:messageId/react",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== "string" || emoji.length > 8) {
      const err = new Error("Valid emoji required");
      err.statusCode = 400;
      throw err;
    }
    const { message, added } = await chatService.addReaction(req.params.messageId, req.user.userId, emoji);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      const reactionsObj = {};
      if (msgObj.reactions) {
        msgObj.reactions.forEach((users, key) => {
          reactionsObj[key] = users.map(String);
        });
      }
      emitToChat(req.params.chatId, "reaction_updated", {
        messageId: req.params.messageId,
        chatId: req.params.chatId,
        reactions: reactionsObj,
        userId: req.user.userId,
        emoji,
      });

      if (added && String(msgObj.sender) !== String(req.user.userId)) {
        const notif = await notificationService.create(
          String(msgObj.sender), req.user.userId, req.tenantId, "message_reaction",
          { chat: req.params.chatId, messageId: req.params.messageId, message: `reacted ${emoji} to your message` }
        );
        emitToUser(String(msgObj.sender), "notification", { type: "message_reaction", notification: notif });
      }
    } catch (_) {}

    res.send({ success: true, data: message, statusCode: 200 });
  })
);

router.post(
  "/:chatId/messages/:messageId/reply",
  requireAuth,
  tenantMiddleware,
  idempotencyMiddleware(),
  validate(messageReplySchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.sendMessage(req.params.chatId, req.user.userId, req.tenantId, {
      ...req.body,
      replyTo: req.params.messageId,
    });
    await invalidateCache(`chat:${req.params.chatId}:*`);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(req.params.chatId, "receive_message", {
        ...msgObj,
        senderId: req.user.userId,
        tempId: req.body.tempId || null,
        isReply: true,
      });

      const io = getIO();
      await typingService.clearOnMessageSent(req.user.userId, req.params.chatId, io);

      const Message = (await import("../models/message.js")).default;
      const parentMessage = await Message.findById(req.params.messageId).lean();
      if (parentMessage && String(parentMessage.sender) !== String(req.user.userId)) {
        const notif = await notificationService.create(
          parentMessage.sender, req.user.userId, req.tenantId, "thread_reply",
          { chat: req.params.chatId, messageId: req.params.messageId, message: "replied to your message" }
        );
        emitToUser(String(parentMessage.sender), "notification", { type: "thread_reply", notification: notif });
        emitToUser(String(parentMessage.sender), "thread_reply", {
          chatId: req.params.chatId,
          parentMessageId: req.params.messageId,
          reply: msgObj,
        });
      }

      if (Array.isArray(msgObj.mentions) && msgObj.mentions.length > 0) {
        const mentionedUserIds = msgObj.mentions
          .map((m) => String(typeof m === "object" ? m._id || m : m))
          .filter((id) => id !== String(req.user.userId));

        for (const mentionedId of mentionedUserIds) {
          const notif = await notificationService.create(
            mentionedId, req.user.userId, req.tenantId, "chat_mention",
            { chat: req.params.chatId, messageId: msgObj._id, message: "mentioned you in a message" }
          );
          emitToUser(mentionedId, "notification", { type: "chat_mention", notification: notif });
          emitToUser(mentionedId, "user_mentioned", {
            chatId: req.params.chatId,
            messageId: msgObj._id,
            mentionedBy: req.user.userId,
            text: msgObj.text,
          });
        }
      }
    } catch (_) {}

    res.status(201).send({ success: true, message: "Reply sent", data: message, statusCode: 201 });
  })
);

router.post(
  "/:chatId/messages/:messageId/forward",
  requireAuth,
  tenantMiddleware,
  validate(messageForwardSchema),
  asyncHandler(async (req, res) => {
    const { targetChatId } = req.body;
    const message = await chatService.forwardMessage(req.params.messageId, targetChatId, req.user.userId);

    try {
      emitToChat(targetChatId, "receive_message", {
        ...message.toObject(),
        senderId: req.user.userId,
        forwarded: true,
      });
    } catch (_) {}

    res.status(201).send({ success: true, data: message, statusCode: 201 });
  })
);

router.get(
  "/:chatId/messages/:messageId/thread",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await chatService.getThreadReplies(req.params.messageId, req.user.userId, req.query);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

// ── Delivery Receipts ─────────────────────────────────────────────────────────

router.post(
  "/:chatId/messages/:messageId/deliver",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const message = await chatService.markDelivered(req.params.messageId, req.user.userId);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToUser(String(msgObj.sender), "delivery_confirmed", {
        messageId: req.params.messageId,
        chatId: req.params.chatId,
        deliveredTo: req.user.userId,
        deliveredAt: new Date(),
        status: msgObj.status,
      });
    } catch (_) {}

    res.send({ success: true, data: message, statusCode: 200 });
  })
);

router.post(
  "/:chatId/messages/batch-deliver",
  requireAuth,
  tenantMiddleware,
  validate(batchDeliveryAckSchema),
  asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    const results = [];

    for (const messageId of messageIds) {
      try {
        const message = await chatService.markDelivered(messageId, req.user.userId);
        const msgObj = message.toObject ? message.toObject() : message;
        results.push({ messageId, status: "ok", messageStatus: msgObj.status });

        try {
          emitToUser(String(msgObj.sender), "delivery_confirmed", {
            messageId,
            chatId: req.params.chatId,
            deliveredTo: req.user.userId,
            deliveredAt: new Date(),
            status: msgObj.status,
          });
        } catch (_) {}
      } catch (err) {
        results.push({ messageId, status: "error", message: err.message });
      }
    }

    res.send({ success: true, data: results, statusCode: 200 });
  })
);

// ── Receipt Details ───────────────────────────────────────────────────────────

router.get(
  "/:chatId/messages/:messageId/receipts",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const receipts = await chatService.getMessageReceipts(req.params.messageId, req.user.userId);
    res.send({ success: true, data: receipts, statusCode: 200 });
  })
);

// ── Last Seen ─────────────────────────────────────────────────────────────────

router.get(
  "/users/:userId/last-seen",
  requireAuth,
  asyncHandler(async (req, res) => {
    const User = (await import("../models/user.js")).default;
    const user = await User.findById(req.params.userId)
      .select("isOnline lastSeen showOnlineStatus firstname lastname")
      .lean();

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const visible = user.showOnlineStatus !== false;
    res.send({
      success: true,
      data: {
        userId: user._id,
        isOnline: visible ? user.isOnline : false,
        lastSeen: visible ? user.lastSeen : null,
        showOnlineStatus: visible,
      },
      statusCode: 200,
    });
  })
);

router.get(
  "/:chatId/members/search",
  requireAuth,
  tenantMiddleware,
  validate(mentionSearchQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await chatService.getChatMembersForMentions(req.params.chatId, req.user.userId, {
      q: req.query.q,
      limit: req.query.limit,
    });
    res.send({ success: true, data: result.members, total: result.total, statusCode: 200 });
  })
);

router.get(
  "/:chatId/mentions",
  requireAuth,
  tenantMiddleware,
  validate(mentionedMessagesQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await chatService.getMentionedMessages(req.params.chatId, req.user.userId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    res.send({ success: true, data: result.messages, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

export default router;
