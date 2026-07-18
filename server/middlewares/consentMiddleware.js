import consentService from "../services/consentService.js";
import logger from "../utils/logger.js";

/**
 * requireConsent — middleware that checks if the authenticated user
 * has granted a specific consent type.
 *
 * Usage:
 *   router.post("/record", requireAuth, requireConsent("recording"), handler);
 */
export const requireConsent = (consentType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).send({ success: false, message: "Authentication required", statusCode: 401 });
      }

      const tenantId = req.user.tenantId || null;
      const status = await consentService.getConsentStatus(req.user.userId, consentType, tenantId);

      if (!status.granted) {
        logger.warn(`[Consent] Denied: user=${req.user.userId} type=${consentType}`);
        return res.status(403).send({
          success: false,
          message: `Consent required: ${consentType}. Please grant consent in your privacy settings.`,
          statusCode: 403,
          consentType,
        });
      }

      next();
    } catch (err) {
      logger.error("[Consent] Middleware error", { error: err.message });
      next(err);
    }
  };
};

/**
 * requireConsents — middleware that checks if the user has granted
 * ALL of the specified consent types.
 *
 * Usage:
 *   router.post("/share-location", requireAuth, requireConsents(["location_sharing", "data_processing"]), handler);
 */
export const requireConsents = (consentTypes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).send({ success: false, message: "Authentication required", statusCode: 401 });
      }

      const tenantId = req.user.tenantId || null;
      const results = await consentService.checkMultipleConsents(req.user.userId, consentTypes, tenantId);

      const missing = consentTypes.filter((type) => !results[type]?.granted);
      if (missing.length > 0) {
        logger.warn(`[Consent] Denied: user=${req.user.userId} missing=${missing.join(",")}`);
        return res.status(403).send({
          success: false,
          message: `Consent required: ${missing.join(", ")}. Please grant consent in your privacy settings.`,
          statusCode: 403,
          missingConsents: missing,
        });
      }

      next();
    } catch (err) {
      logger.error("[Consent] Middleware error", { error: err.message });
      next(err);
    }
  };
};

/**
 * optionalConsent — attaches consent status to req.consentStatus
 * but does NOT block the request. Use for feature flags.
 *
 * Usage:
 *   router.get("/analytics", requireAuth, optionalConsent("analytics"), (req, res) => {
 *     if (req.consentStatus.analytics?.granted) {
 *       // include analytics
 *     }
 *   });
 */
export const optionalConsent = (consentType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return next();

      const tenantId = req.user.tenantId || null;
      req.consentStatus = req.consentStatus || {};
      req.consentStatus[consentType] = await consentService.getConsentStatus(
        req.user.userId,
        consentType,
        tenantId
      );

      next();
    } catch (err) {
      logger.error("[Consent] Optional consent error", { error: err.message });
      next();
    }
  };
};
