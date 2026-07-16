import { AppError } from "../utils/AppError.js";
import User from "../models/user.js";
import logger from "../utils/logger.js";

/**
 * RBAC — Role-Based Access Control system.
 *
 * Permission hierarchy:
 *   admin   > moderator > user
 *
 * Each role inherits all permissions of lower roles.
 * Permissions are checked via `requirePermission('post:delete')`.
 */

export const ROLES = {
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
};

// Permission definitions per role
export const PERMISSIONS = {
  // Posts
  "post:create":      [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "post:read":        [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "post:update":      [ROLES.MODERATOR, ROLES.ADMIN],    // own post OR mod/admin
  "post:delete":      [ROLES.MODERATOR, ROLES.ADMIN],    // own post OR mod/admin
  "post:delete_any":  [ROLES.ADMIN],

  // Users
  "user:read":        [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "user:update":      [ROLES.MODERATOR, ROLES.ADMIN],    // own profile OR mod/admin
  "user:update_any":  [ROLES.ADMIN],
  "user:delete":      [ROLES.ADMIN],
  "user:ban":          [ROLES.MODERATOR, ROLES.ADMIN],

  // Moderation
  "content:moderate":  [ROLES.MODERATOR, ROLES.ADMIN],
  "content:hide":      [ROLES.MODERATOR, ROLES.ADMIN],
  "user:view_history": [ROLES.MODERATOR, ROLES.ADMIN],

  // Admin-only
  "admin:panel":      [ROLES.ADMIN],
  "admin:manage_roles":[ROLES.ADMIN],
  "admin:view_metrics":[ROLES.ADMIN],
  "admin:manage_tenants":[ROLES.ADMIN],
  "admin:manage_billing":[ROLES.ADMIN],

  // Chat / Messages
  "chat:read":         [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "chat:create":       [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "message:delete_any":[ROLES.MODERATOR, ROLES.ADMIN],

  // Billing
  "billing:view":      [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "billing:manage":    [ROLES.ADMIN],

  // Data access
  "data:read_own":     [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "data:read_any":     [ROLES.MODERATOR, ROLES.ADMIN],
  "data:update_own":   [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "data:update_any":   [ROLES.ADMIN],
  "data:export_own":   [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "data:export_any":   [ROLES.ADMIN],
  "data:delete_own":   [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "data:delete_any":   [ROLES.ADMIN],

  // Consent management
  "consent:manage_own": [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "consent:view_own":   [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "consent:view_any":   [ROLES.MODERATOR, ROLES.ADMIN],

  // Audit logs
  "audit:view_own":    [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "audit:view_any":    [ROLES.MODERATOR, ROLES.ADMIN],
  "audit:manage":      [ROLES.ADMIN],

  // Privacy
  "privacy:manage_own": [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN],
  "privacy:manage_any": [ROLES.ADMIN],
};

// Role level map for comparison
export const ROLE_LEVEL = { [ROLES.USER]: 1, [ROLES.MODERATOR]: 2, [ROLES.ADMIN]: 3 };

/**
 * requireRole(...roles) — middleware that checks the user has one of the required roles.
 * Use for entire route-level protection.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({ success: false, message: "Authentication required", statusCode: 401 });
    }
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`[RBAC] Access denied: user=${req.user.userId} role=${req.user.role} required=${allowedRoles.join(",")}`, {
        path: req.originalUrl, method: req.method,
      });
      return res.status(403).send({ success: false, message: "Insufficient permissions", statusCode: 403 });
    }
    next();
  };
};

/**
 * requirePermission(...permissions) — middleware that checks the user has any of the required permissions.
 * A user with role "moderator" automatically satisfies "post:update", "content:moderate", etc.
 */
export const requirePermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({ success: false, message: "Authentication required", statusCode: 401 });
    }

    const userRole = req.user.role;

    for (const permission of permissions) {
      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles) {
        logger.warn(`[RBAC] Unknown permission referenced: ${permission}`);
        continue;
      }
      if (allowedRoles.includes(userRole)) {
        return next();  // User has this permission — allow
      }
    }

    logger.warn(`[RBAC] Permission denied: user=${req.user.userId} role=${userRole} needed=${permissions.join("|")}`, {
      path: req.originalUrl, method: req.method,
    });
    return res.status(403).send({ success: false, message: "Insufficient permissions", statusCode: 403 });
  };
};

/**
 * requireMinRole(minRole) — allows any role at or above the minimum.
 * e.g., requireMinRole(ROLES.MODERATOR) allows moderator and admin.
 */
export const requireMinRole = (minRole) => {
  const minLevel = ROLE_LEVEL[minRole] ?? 0;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({ success: false, message: "Authentication required", statusCode: 401 });
    }
    const userLevel = ROLE_LEVEL[req.user.role] ?? 0;
    if (userLevel < minLevel) {
      return res.status(403).send({ success: false, message: "Insufficient permissions", statusCode: 403 });
    }
    next();
  };
};

/**
 * isRoleOrHigher(userRole, minRole) — utility for role comparisons in service layer.
 */
export function isRoleOrHigher(userRole, minRole) {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
}

/**
 * canModerate(userRole) — true if role can perform moderation actions.
 */
export const canModerate = (role) => ROLE_LEVEL[role] >= ROLE_LEVEL[ROLES.MODERATOR];

/**
 * isAdmin(role) — true if role is admin.
 */
export const isAdmin = (role) => role === ROLES.ADMIN;