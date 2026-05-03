import express from "express";
import billingService from "../services/billingService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware, requireTenant } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";

const router = express.Router();

// ── GET /billing/plans ──────────────────────────────────────────────────────────
router.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const plans = await billingService.getPlans();
    res.send({ success: true, data: plans, statusCode: 200 });
  })
);

// ── POST /billing/checkout — create Stripe checkout session ───────────────────
router.post(
  "/checkout",
  requireAuth,
  tenantMiddleware,
  requireTenant,
  asyncHandler(async (req, res) => {
    const { plan } = req.body;
    const result = await billingService.createCheckoutSession(req.user.userId, req.tenantId, plan);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

// ── GET /billing/subscription — current subscription status ────────────────────
router.get(
  "/subscription",
  requireAuth,
  tenantMiddleware,
  requireTenant,
  asyncHandler(async (req, res) => {
    const result = await billingService.getSubscriptionStatus(req.tenantId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

// ── POST /billing/portal — Stripe customer portal ─────────────────────────────
router.post(
  "/portal",
  requireAuth,
  tenantMiddleware,
  requireTenant,
  asyncHandler(async (req, res) => {
    const result = await billingService.createPortalSession(req.tenantId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

export default router;