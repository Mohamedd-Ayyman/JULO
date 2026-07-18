import express from "express";
import moderationService from "../services/moderationService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/rbac.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import {
  validate,
  blockUserSchema,
  reportMessageSchema,
  reportUserSchema,
  reportQuerySchema,
  reportReviewSchema,
} from "../utils/validate.js";
import { emitToUser, emitToChat } from "../utils/socket.js";
import { redis } from "../config/redis.js";

const router = express.Router();

// ── Blocking ──────────────────────────────────────────────────────────────────

const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW = 3600;

async function reportRateLimit(userId) {
  const key = `ratelimit:report:${userId}:${Math.floor(Date.now() / 1000 / REPORT_RATE_WINDOW)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, REPORT_RATE_WINDOW + 1);
  return { allowed: count <= REPORT_RATE_LIMIT, remaining: Math.max(0, REPORT_RATE_LIMIT - count) };
}

router.post(
  "/block",
  requireAuth,
  tenantMiddleware,
  validate(blockUserSchema),
  asyncHandler(async (req, res) => {
    const block = await moderationService.blockUser(req.user.userId, req.body.userId, req.tenantId);
    try { await redis.del(`blocks:${req.user.userId}`); } catch (_) {}
    res.status(201).send({ success: true, data: block, statusCode: 201 });
  })
);

router.delete(
  "/block/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await moderationService.unblockUser(req.user.userId, req.params.userId);
    try { await redis.del(`blocks:${req.user.userId}`); } catch (_) {}
    res.send({ success: true, message: "User unblocked", statusCode: 200 });
  })
);

router.get(
  "/blocks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await moderationService.getBlockedUsers(req.user.userId, { page, limit });
    res.send({ success: true, data: result.blocks, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

router.get(
  "/block/status/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await moderationService.getBlockStatus(req.user.userId, req.params.userId);
    res.send({ success: true, data: status, statusCode: 200 });
  })
);

// ── Reporting ─────────────────────────────────────────────────────────────────

router.post(
  "/report",
  requireAuth,
  tenantMiddleware,
  validate(reportMessageSchema),
  asyncHandler(async (req, res) => {
    const rateCheck = await reportRateLimit(req.user.userId);
    if (!rateCheck.allowed) {
      const err = new Error("Too many reports. Please try again later.");
      err.statusCode = 429;
      throw err;
    }

    const report = await moderationService.reportMessage(
      req.user.userId,
      req.body.messageId,
      req.body.chatId,
      req.body.reason,
      req.body.description,
      req.tenantId
    );

    try {
      const counts = await moderationService.getReportCounts(req.tenantId);
      const { default: User } = await import("../models/user.js");
      const mods = await User.find({ role: { $in: ["moderator", "admin"] } }).select("_id").lean();
      for (const mod of mods) {
        emitToUser(String(mod._id), "report_filed", { counts });
      }
    } catch (_) {}

    res.status(201).send({ success: true, data: report, statusCode: 201 });
  })
);

router.post(
  "/report/user",
  requireAuth,
  tenantMiddleware,
  validate(reportUserSchema),
  asyncHandler(async (req, res) => {
    const rateCheck = await reportRateLimit(req.user.userId);
    if (!rateCheck.allowed) {
      const err = new Error("Too many reports. Please try again later.");
      err.statusCode = 429;
      throw err;
    }

    const report = await moderationService.reportUser(
      req.user.userId,
      req.body.userId,
      req.body.reason,
      req.body.description,
      req.tenantId
    );

    try {
      const counts = await moderationService.getReportCounts(req.tenantId);
      const { default: User } = await import("../models/user.js");
      const mods = await User.find({ role: { $in: ["moderator", "admin"] } }).select("_id").lean();
      for (const mod of mods) {
        emitToUser(String(mod._id), "report_filed", { counts });
      }
    } catch (_) {}

    res.status(201).send({ success: true, data: report, statusCode: 201 });
  })
);

// ── Moderation Queue (mod/admin only) ─────────────────────────────────────────

router.get(
  "/reports",
  requireAuth,
  requirePermission("moderation:read"),
  tenantMiddleware,
  validate(reportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await moderationService.getReports({
      status: req.query.status,
      reason: req.query.reason,
      targetType: req.query.targetType,
      tenantId: req.tenantId,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.send({
      success: true,
      data: result.reports,
      total: result.total,
      page: result.page,
      pages: result.pages,
      statusCode: 200,
    });
  })
);

router.put(
  "/reports/:reportId/review",
  requireAuth,
  requirePermission("moderation:review"),
  validate(reportReviewSchema),
  asyncHandler(async (req, res) => {
    const report = await moderationService.reviewReport(
      req.params.reportId,
      req.user.userId,
      {
        status: req.body.status,
        action: req.body.action,
        actionNote: req.body.actionNote,
      }
    );

    if (report.action === "message_deleted" && report.targetType === "message") {
      try {
        const msg = (await import("../models/message.js")).default;
        const message = await msg.findById(report.targetId).lean();
        if (message) {
          emitToChat(String(message.chatId), "message_hidden", {
            messageId: report.targetId,
            chatId: String(message.chatId),
            moderatedBy: req.user.userId,
          });
        }
      } catch (_) {}
    }

    if ((report.action === "user_muted" || report.action === "user_banned") && report.targetType === "user") {
      try {
        emitToUser(String(report.targetId), "user_moderated", {
          action: report.action,
          actionNote: report.actionNote,
          moderatedBy: req.user.userId,
        });
      } catch (_) {}
    }

    if ((report.action === "user_muted" || report.action === "user_banned") && report.targetType === "message") {
      try {
        const msg = (await import("../models/message.js")).default;
        const message = await msg.findById(report.targetId).lean();
        if (message) {
          emitToUser(String(message.sender), "user_moderated", {
            action: report.action,
            actionNote: report.actionNote,
            chatId: String(message.chatId),
            moderatedBy: req.user.userId,
          });
        }
      } catch (_) {}
    }

    try {
      emitToUser(String(report.reporterId), "report_update", {
        reportId: report._id,
        status: report.status,
        action: report.action,
        actionNote: report.actionNote,
      });
    } catch (_) {}

    res.send({ success: true, data: report, statusCode: 200 });
  })
);

router.get(
  "/reports/counts",
  requireAuth,
  requirePermission("moderation:read"),
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const counts = await moderationService.getReportCounts(req.tenantId);
    res.send({ success: true, data: counts, statusCode: 200 });
  })
);

export default router;
