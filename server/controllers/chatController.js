import express from "express";
import chatService from "../services/chatService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, chatCreateSchema, chatUpdateSchema, messageSchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";
import { emitToChat, emitToUsers } from "../utils/socket.js";

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
    const chats = await chatService.getAllForUser(req.user.userId, req.tenantId);
    res.send({ success: true, data: chats, statusCode: 200 });
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
    } catch (_) {}

    res.status(201).send({ success: true, message: "Message sent", data: message, statusCode: 201 });
  })
);

router.get(
  "/retrieve-chat/:chatId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await chatService.getMessages(req.params.chatId, req.user.userId, req.query);
    res.send({ success: true, data: result.messages, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
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

export default router;
