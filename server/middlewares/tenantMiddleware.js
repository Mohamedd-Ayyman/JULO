import Tenant from "../models/tenant.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

/**
 * tenantMiddleware — attaches the user's tenant context to req.
 *
 * - For personal accounts (tenantId = null): allows access to all data
 * - For workspace members: scopes all queries to their tenantId
 *
 * Usage:
 *   router.get("/posts", tenantMiddleware, asyncHandler(async (req, res) => {
 *     const posts = await postService.getFeed({ tenantId: req.tenantId });
 *   }));
 */
export const tenantMiddleware = async (req, res, next) => {
  const userTenantId = req.user?.tenantId || null;

  if (!userTenantId) {
    // Personal account — no tenant scoping
    req.tenantId = null;
    req.isPersonalAccount = true;
    req.tenant = null;
    return next();
  }

  // Load tenant for feature limit checks
  const tenant = await Tenant.findById(userTenantId).lean();
  if (!tenant) {
    return res.status(403).send({ success: false, message: "Workspace not found", statusCode: 403 });
  }

  if (tenant.status !== "active" && tenant.status !== "trial") {
    const msg = tenant.status === "suspended"
      ? "Workspace is suspended. Contact support."
      : "Workspace is inactive.";
    return res.status(403).send({ success: false, message: msg, statusCode: 403 });
  }

  req.tenantId = userTenantId;
  req.tenant = tenant;
  req.isPersonalAccount = false;

  next();
};

/**
 * requireTenant — ensures the request is from a workspace (not personal account).
 * Use for features that require a workspace (e.g., team management).
 */
export const requireTenant = (req, res, next) => {
  if (req.isPersonalAccount) {
    return res.status(403).send({
      success: false,
      message: "This feature requires a workspace. Create or join a workspace to continue.",
      statusCode: 403,
    });
  }
  next();
};

/**
 * scopeByTenant — mixin that injects tenantId into query conditions.
 * Call this on every model query that should be tenant-scoped.
 *
 * Usage in service layer:
 *   const query = scopeByTenant(Post.find({ visibility: "public" }), tenantId);
 *   const posts = await query.sort({ createdAt: -1 }).lean();
 *
 * Personal accounts (tenantId = null): no scoping applied.
 * Workspace accounts: always add tenantId filter.
 */
export function scopeByTenant(baseQuery, tenantId) {
  if (tenantId === null || tenantId === undefined) return baseQuery;
  return baseQuery.where({ tenantId });
}

/**
 * RequireFeature — gate features behind plan/feature flags.
 *
 * Usage:
 *   router.get("/analytics", requireAuth, tenantMiddleware,
 *     requireFeature("analytics"),
 *     asyncHandler(analyticsHandler)
 *   );
 */
export const requireFeature = (feature, options = {}) => {
  const { planMinimum = "starter" } = options;

  return (req, res, next) => {
    const tenant = req.tenant;

    // Personal free accounts: check feature map
    if (!tenant) {
      const FREE_FEATURES = { analytics: false, apiAccess: false, customBranding: false, dataExport: false };
      if (!FREE_FEATURES[feature]) return next();
      return res.status(403).send({
        success: false,
        message: `Feature '${feature}' is not available on your plan. Upgrade to access.`,
        statusCode: 403,
      });
    }

    const hasFlag = tenant.features?.get?.(feature) ?? null;
    const enabled = hasFlag !== null ? hasFlag : tenant.hasFeature?.(feature) ?? false;

    if (!enabled) {
      logger.info(`[FeatureGate] Blocked: feature=${feature} tenant=${tenant._id} plan=${tenant.plan}`);
      return res.status(403).send({
        success: false,
        message: `Feature '${feature}' requires a ${planMinimum}+ plan.`,
        statusCode: 403,
      });
    }

    next();
  };
};

/**
 * checkUsageLimit — check if tenant has exceeded a usage limit.
 * Returns { allowed, current, limit } or throws AppError.
 *
 * Call in service layer before expensive operations.
 */
export async function checkUsageLimit(tenantId, limitKey, incrementBy = 0) {
  if (!tenantId) return;  // Personal accounts: no limits

  const tenant = await Tenant.findById(tenantId).select("usage limits plan");
  if (!tenant) throw new AppError("Workspace not found", 404);

  const limit = tenant.limits?.[limitKey];
  if (limit === undefined) return;  // No limit defined

  const current = (tenant.usage?.[limitKey] || 0) + incrementBy;
  if (current > limit) {
    throw new AppError(`Usage limit reached: ${limitKey} (${current}/${limit}). Upgrade your plan.`, 403);
  }
}

/**
 * Increment usage counter atomically (thread-safe).
 */
export async function incrementUsage(tenantId, key, amount = 1) {
  if (!tenantId) return;
  await Tenant.findByIdAndUpdate(tenantId, { $inc: { [`usage.${key}`]: amount } });
}

/**
 * Decrement usage counter atomically (never goes below 0).
 */
export async function decrementUsage(tenantId, key, amount = 1) {
  if (!tenantId) return;
  // Atomic decrement — capped at 0 with $max
  await Tenant.findByIdAndUpdate(tenantId, { $inc: { [`usage.${key}`]: -amount } });
}