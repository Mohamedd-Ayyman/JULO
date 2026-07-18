import express from "express";
import presenceService from "../services/presenceService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";

const router = express.Router();

router.get(
  "/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (userId === req.user.userId) {
      return res.send({
        success: true,
        data: { isOnline: true, lastSeen: null, showOnlineStatus: true },
        statusCode: 200,
      });
    }

    const presence = await presenceService.getPresence(userId);
    res.send({ success: true, data: presence, statusCode: 200 });
  })
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userIds } = req.query;

    if (!userIds || typeof userIds !== "string") {
      return res.status(400).send({
        success: false,
        message: "userIds query parameter is required (comma-separated)",
        statusCode: 400,
      });
    }

    const ids = userIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).send({
        success: false,
        message: "At least one userId is required",
        statusCode: 400,
      });
    }

    if (ids.length > 100) {
      return res.status(400).send({
        success: false,
        message: "Maximum 100 userIds per request",
        statusCode: 400,
      });
    }

    const presence = await presenceService.getBulkPresence(ids);
    res.send({ success: true, data: presence, statusCode: 200 });
  })
);

export default router;
