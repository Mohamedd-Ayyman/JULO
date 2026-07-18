import express from "express";
import auditService from "../services/auditService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requirePermission, isAdmin } from "../middlewares/rbac.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, auditQuerySchema } from "../utils/validate.js";

const router = express.Router();

// ── Get current user's audit trail ────────────────────────────────────
router.get(
  "/my-activity",
  requireAuth,
  requirePermission("audit:view_own"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const { page, limit } = req.query;
    const result = await auditService.getUserAuditTrail(
      req.user.userId,
      tenantId,
      { page, limit }
    );
    res.send({ success: true, data: result.logs, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get audit logs for a specific resource ─────────────────────────────
router.get(
  "/resource/:resource/:resourceId",
  requireAuth,
  requirePermission("audit:view_any"),
  asyncHandler(async (req, res) => {
    const { resource, resourceId } = req.params;
    const tenantId = req.user.tenantId || null;
    const logs = await auditService.getResourceAuditTrail(resource, resourceId, tenantId);
    res.send({ success: true, data: logs, total: logs.length, statusCode: 200 });
  })
);

// ── Get audit logs for a specific user (admin/moderator) ───────────────
router.get(
  "/user/:userId",
  requireAuth,
  requirePermission("audit:view_any"),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const tenantId = req.user.tenantId || null;
    const { page, limit } = req.query;
    const result = await auditService.getUserAuditTrail(userId, tenantId, { page, limit });
    res.send({ success: true, data: result.logs, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Query audit logs (admin only) ──────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requirePermission("audit:view_any"),
  validate(auditQuerySchema),
  asyncHandler(async (req, res) => {
    const { userId, action, resource, resourceId, startDate, endDate, page, limit } = req.query;
    const tenantId = req.user.tenantId || null;

    const filters = { tenantId };
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (resourceId) filters.resourceId = resourceId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await auditService.getAuditLogs(filters, { page, limit });
    res.send({ success: true, data: result.logs, total: result.total, page: result.page, pages: result.pages, statusCode: 200 });
  })
);

// ── Get audit statistics (admin only) ──────────────────────────────────
router.get(
  "/stats",
  requireAuth,
  requirePermission("audit:manage"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const { startDate } = req.query;
    const stats = await auditService.getAuditStats(tenantId, startDate);
    res.send({ success: true, data: stats, statusCode: 200 });
  })
);

// ── Cleanup old logs (admin only) ──────────────────────────────────────
router.delete(
  "/cleanup",
  requireAuth,
  requirePermission("audit:manage"),
  asyncHandler(async (req, res) => {
    const { retentionDays } = req.body;
    const days = retentionDays || 365;
    const deletedCount = await auditService.cleanupOldLogs(days);
    res.send({ success: true, message: `Cleaned up ${deletedCount} old audit logs`, data: { deletedCount }, statusCode: 200 });
  })
);

export default router;
