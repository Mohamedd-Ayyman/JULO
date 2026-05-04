import express from "express";
import chatService from "../services/chatService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, messageSchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.put(
  "/mark-read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await chatService.markRead(req.body.chatId, req.user.userId);
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
    res.status(201).send({ success: true, message: "Message sent", data: message, statusCode: 201 });
  })
);

router.get(
  "/retrieve-chat/:chatId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await chatService.getMessages(req.params.chatId, req.user.userId, req.query);
    res.send({ success: true, data: result.messages, total: result.total, statusCode: 200 });
  })
);

router.put(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await chatService.editMessage(req.params.messageId, req.user.userId, req.body.text);
    res.send({ success: true, message: "Message updated", data: message, statusCode: 200 });
  })
);

router.delete(
  "/:messageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await chatService.deleteMessage(req.params.messageId, req.user.userId);
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
    res.send({ success: true, data: message, statusCode: 200 });
  })
);

export default router;
