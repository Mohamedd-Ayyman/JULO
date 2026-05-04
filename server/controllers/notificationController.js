import express from "express";
import notificationService from "../services/notificationService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";

const router = express.Router();

router.get(
  "/all",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await notificationService.getAll(req.user.userId, req.tenantId, req.query);
    res.send({ success: true, data: result.notifications, unreadCount: result.unreadCount, statusCode: 200 });
  })
);

router.put(
  "/read-all",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.userId, req.tenantId);
    res.send({ success: true, message: "All notifications marked as read", statusCode: 200 });
  })
);

router.put(
  "/:notificationId/read",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.markOneRead(req.params.notificationId, req.user.userId, req.tenantId);
    res.send({ success: true, message: "Notification marked as read", statusCode: 200 });
  })
);

router.delete(
  "/:notificationId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await notificationService.delete(req.params.notificationId, req.user.userId, req.tenantId);
    res.send({ success: true, message: "Notification deleted", statusCode: 200 });
  })
);

export default router;