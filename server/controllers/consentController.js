import express from "express";
import consentService from "../services/consentService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requirePermission } from "../middlewares/rbac.js";
import { auditConsentChange } from "../middlewares/auditMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { validate, consentUpdateSchema } from "../utils/validate.js";

const router = express.Router();

// ── Get all consents for current user ─────────────────────────────────
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const consents = await consentService.getUserConsents(req.user.userId, tenantId);
    res.send({ success: true, data: consents, statusCode: 200 });
  })
);

// ── Get consent status for a specific type ─────────────────────────────
router.get(
  "/:consentType/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const status = await consentService.getConsentStatus(
      req.user.userId,
      req.params.consentType,
      tenantId
    );
    res.send({ success: true, data: status, statusCode: 200 });
  })
);

// ── Get consent history for a specific type ────────────────────────────
router.get(
  "/:consentType/history",
  requireAuth,
  requirePermission("consent:view_own"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId || null;
    const history = await consentService.getConsentHistory(
      req.user.userId,
      req.params.consentType,
      tenantId
    );
    res.send({ success: true, data: history, statusCode: 200 });
  })
);

// ── Grant consent ──────────────────────────────────────────────────────
router.post(
  "/:consentType/grant",
  requireAuth,
  requirePermission("consent:manage_own"),
  auditConsentChange(),
  asyncHandler(async (req, res) => {
    const metadata = {
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      version: req.body.version || "1.0",
    };

    const consent = await consentService.grantConsent(
      req.user.userId,
      req.params.consentType,
      metadata
    );

    res.send({ success: true, message: "Consent granted", data: consent, statusCode: 200 });
  })
);

// ── Revoke consent ─────────────────────────────────────────────────────
router.post(
  "/:consentType/revoke",
  requireAuth,
  requirePermission("consent:manage_own"),
  auditConsentChange(),
  asyncHandler(async (req, res) => {
    const metadata = {
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      reason: req.body.reason || null,
    };

    const consent = await consentService.revokeConsent(
      req.user.userId,
      req.params.consentType,
      metadata
    );

    res.send({ success: true, message: "Consent revoked", data: consent, statusCode: 200 });
  })
);

// ── Bulk update consents ───────────────────────────────────────────────
router.put(
  "/",
  requireAuth,
  requirePermission("consent:manage_own"),
  validate(consentUpdateSchema),
  auditConsentChange(),
  asyncHandler(async (req, res) => {
    const metadata = {
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const results = await consentService.bulkUpdateConsents(
      req.user.userId,
      req.body.consents,
      metadata
    );

    const allSuccess = results.every((r) => r.success);
    res.send({
      success: allSuccess,
      message: allSuccess ? "Consents updated" : "Some consents failed to update",
      data: results,
      statusCode: 200,
    });
  })
);

export default router;
