import express from "express";
import chatService from "../services/chatService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, chatCreateSchema, messageSchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.post(
  "/create-new-chat",
  requireAuth,
  tenantMiddleware,
  validate(chatCreateSchema),
  asyncHandler(async (req, res) => {
    const chat = await chatService.createOrFind(req.user.userId, req.tenantId, req.body.members);
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
    res.send({ success: true, data: result.messages, total: result.total, statusCode: 200 });
  })
);

export default router;