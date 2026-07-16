import express from "express";
import chatService from "../services/chatService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, chatCreateSchema, chatUpdateSchema, messageSchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.post(
  "/create-new-chat",
  requireAuth,
  tenantMiddleware,
  validate(chatCreateSchema),
  asyncHandler(async (req, res) => {
    const { members, type, name, description, icon } = req.body;
    const chat = await chatService.createOrFind(req.user.userId, req.tenantId, members, { type, name, description, icon });
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
    res.send({ success: true, data: chat, statusCode: 200 });
  })
);

router.put(
  "/pin-message/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await chatService.pinMessage(req.params.messageId, req.user.userId);
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
    await chatService.deleteChat(req.params.chatId, req.user.userId);
    res.send({ success: true, message: "Chat deleted", statusCode: 200 });
  })
);

export default router;
