import express from "express";
import chatService from "../services/chatService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, messageSchema, messageReplySchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";
import { emitToChat } from "../utils/socket.js";

const router = express.Router();

router.put(
  "/mark-read",
  requireAuth,
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

router.post(
  "/reply",
  requireAuth,
  tenantMiddleware,
  validate(messageReplySchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.sendMessage(req.body.chatId, req.user.userId, req.tenantId, req.body);
    await invalidateCache(`chat:${req.body.chatId}:*`);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(req.body.chatId, "receive_message", {
        ...msgObj,
        senderId: req.user.userId,
        tempId: req.body.tempId || null,
        isReply: true,
      });
    } catch (_) {}

    res.status(201).send({ success: true, message: "Reply sent", data: message, statusCode: 201 });
  })
);

router.get(
  "/retrieve-chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await chatService.getMessages(req.params.chatId, req.user.userId, req.query);
    res.send({ success: true, data: result.messages, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

router.get(
  "/thread/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await chatService.getThreadReplies(req.params.messageId, req.user.userId, req.query);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.put(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await chatService.editMessage(req.params.messageId, req.user.userId, req.body.text);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(String(msgObj.chatId), "message_edited", {
        messageId: req.params.messageId,
        chatId: String(msgObj.chatId),
        text: msgObj.text,
        edited: true,
        editedAt: msgObj.updatedAt,
      });
    } catch (_) {}

    res.send({ success: true, message: "Message updated", data: message, statusCode: 200 });
  })
);

router.delete(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const Message = (await import("../models/message.js")).default;
    const msgData = await Message.findById(req.params.messageId).lean().catch(() => null);

    await chatService.deleteMessage(req.params.messageId, req.user.userId);

    try {
      if (msgData) {
        emitToChat(String(msgData.chatId), "message_deleted", {
          messageId: req.params.messageId,
          chatId: String(msgData.chatId),
          deletedBy: req.user.userId,
        });
      }
    } catch (_) {}

    res.send({ success: true, message: "Message deleted", statusCode: 200 });
  })
);

router.put(
  "/:messageId/react",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== "string" || emoji.length > 8) {
      const err = new Error("Valid emoji required");
      err.statusCode = 400;
      throw err;
    }
    const message = await chatService.addReaction(req.params.messageId, req.user.userId, emoji);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      const reactionsObj = {};
      if (msgObj.reactions) {
        msgObj.reactions.forEach((users, key) => {
          reactionsObj[key] = users.map(String);
        });
      }
      emitToChat(String(msgObj.chatId), "reaction_updated", {
        messageId: req.params.messageId,
        chatId: String(msgObj.chatId),
        reactions: reactionsObj,
        userId: req.user.userId,
        emoji,
      });
    } catch (_) {}

    res.send({ success: true, data: message, statusCode: 200 });
  })
);

router.put(
  "/:messageId/pin",
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

router.post(
  "/forward",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { messageId, targetChatId } = req.body;
    if (!messageId || !targetChatId) {
      return res.status(400).json({ success: false, message: "messageId and targetChatId are required", statusCode: 400 });
    }
    const message = await chatService.forwardMessage(messageId, targetChatId, req.user.userId);

    try {
      const msgObj = message.toObject ? message.toObject() : message;
      emitToChat(targetChatId, "receive_message", {
        ...msgObj,
        senderId: req.user.userId,
        forwarded: true,
      });
    } catch (_) {}

    res.status(201).send({ success: true, data: message, statusCode: 201 });
  })
);

export default router;
