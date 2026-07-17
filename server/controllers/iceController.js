import express from "express";
import turnService from "../services/turnService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { auditAction } from "../middlewares/auditMiddleware.js";

const router = express.Router();

// ── Get ICE server configuration for WebRTC ─────────────────────────────
router.get(
  "/servers",
  requireAuth,
  auditAction("read", "ice"),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    if (!userId) throw new AppError("Authentication required", 401);

    const result = await turnService.getIceServers(userId);

    res.send({
      success: true,
      data: {
        iceServers: result.iceServers,
        expiresAt: result.expiresAt,
        turnConfigured: result.turnConfigured !== false,
      },
      statusCode: 200,
    });
  })
);

// ── Validate a TURN credential (for coturn external auth) ────────────────
router.post(
  "/validate",
  asyncHandler(async (req, res) => {
    const { username, credential } = req.body;
    if (!username || !credential) {
      throw new AppError("username and credential are required", 400);
    }

    const result = turnService.validateCredential(username, credential);
    if (!result.valid) {
      return res.status(403).send({
        success: false,
        message: result.reason,
        statusCode: 403,
      });
    }

    res.send({ success: true, data: { userId: result.userId }, statusCode: 200 });
  })
);

export default router;
