import auditService from "../services/auditService.js";
import logger from "../utils/logger.js";

/**
 * auditAction — middleware factory that logs an audit entry after
 * the request completes successfully.
 *
 * Usage:
 *   router.delete("/post/:id", requireAuth, auditAction("delete", "post"), handler);
 */
export const auditAction = (action, resource) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || req.params.postId || req.params.messageId || null;
        const tenantId = req.user?.tenantId || null;

        auditService.logAction(
          req.user?.userId,
          action,
          resource,
          resourceId,
          {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          tenantId,
          {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          }
        ).catch((err) => {
          logger.error("[Audit] Failed to log action", { error: err.message });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * auditRead — shorthand for logging read operations.
 *
 * Usage:
 *   router.get("/user/:id", requireAuth, auditRead("user"), handler);
 */
export const auditRead = (resource) => auditAction("read", resource);

/**
 * auditWrite — shorthand for logging write operations.
 * Infers action from HTTP method.
 *
 * Usage:
 *   router.post("/post", requireAuth, auditWrite("post"), handler);
 */
export const auditWrite = (resource) => {
  return async (req, res, next) => {
    const methodActionMap = {
      POST: "create",
      PUT: "update",
      PATCH: "update",
      DELETE: "delete",
    };

    const action = methodActionMap[req.method] || "update";
    return auditAction(action, resource)(req, res, next);
  };
};

/**
 * auditConsentChange — dedicated middleware for logging consent changes.
 *
 * Usage:
 *   router.put("/consents", requireAuth, auditConsentChange(), handler);
 */
export const auditConsentChange = () => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
        const tenantId = req.user?.tenantId || null;

        const consentType = req.body?.consentType || req.body?.consentTypes?.[0] || "unknown";
        const granted = req.body?.granted !== undefined ? req.body.granted : true;

        auditService.logConsentChange(
          req.user?.userId,
          consentType,
          granted,
          tenantId,
          {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          }
        ).catch((err) => {
          logger.error("[Audit] Failed to log consent change", { error: err.message });
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * auditDataAccess — middleware for logging data access on specific resources.
 * Reads the resource ID from req.params and logs a read action.
 *
 * Usage:
 *   router.get("/user/:userId/data", requireAuth, auditDataAccess("user"), handler);
 */
export const auditDataAccess = (resource) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.userId || req.params.id || null;
        const tenantId = req.user?.tenantId || null;

        auditService.logDataAccess(
          req.user?.userId,
          resource,
          resourceId,
          tenantId,
          {
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          }
        ).catch((err) => {
          logger.error("[Audit] Failed to log data access", { error: err.message });
        });
      }

      return originalJson(body);
    };

    next();
  };
};
