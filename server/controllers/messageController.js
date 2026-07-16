import express from "express";
import { asyncHandler } from "../utils/AppError.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import chatService from "../services/chatService.js";

const router = express.Router();

router.get(
  "/thread/:messageId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await chatService.getThreadReplies(req.params.messageId, req.user.userId, req.query);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

export default router;
