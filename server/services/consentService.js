import Consent, { CONSENT_TYPES } from "../models/consent.js";
import logger from "../utils/logger.js";

export class ConsentService {
  async grantConsent(userId, consentType, metadata = {}) {
    this._validateConsentType(consentType);

    const existing = await Consent.findOne({
      userId,
      consentType,
      tenantId: metadata.tenantId || null,
    }).sort({ consentedAt: -1 });

    if (existing && existing.granted && !existing.revokedAt) {
      return existing;
    }

    const consent = await Consent.create({
      userId,
      consentType,
      granted: true,
      version: metadata.version || "1.0",
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      tenantId: metadata.tenantId || null,
    });

    logger.info(`[Consent] Granted: user=${userId} type=${consentType} tenant=${metadata.tenantId || "personal"}`);
    return consent;
  }

  async revokeConsent(userId, consentType, metadata = {}) {
    this._validateConsentType(consentType);

    const existing = await Consent.findOne({
      userId,
      consentType,
      tenantId: metadata.tenantId || null,
      granted: true,
      revokedAt: null,
    }).sort({ consentedAt: -1 });

    if (!existing) {
      const err = new Error("No active consent found to revoke");
      err.statusCode = 404;
      throw err;
    }

    existing.granted = false;
    existing.revokedAt = new Date();
    existing.revokedReason = metadata.reason || null;
    await existing.save();

    logger.info(`[Consent] Revoked: user=${userId} type=${consentType} reason=${metadata.reason || "none"}`);
    return existing;
  }

  async getConsentStatus(userId, consentType, tenantId = null) {
    this._validateConsentType(consentType);

    const consent = await Consent.findOne({
      userId,
      consentType,
      tenantId,
    }).sort({ consentedAt: -1 });

    return {
      consentType,
      granted: consent ? consent.granted && !consent.revokedAt : false,
      consentedAt: consent?.consentedAt || null,
      revokedAt: consent?.revokedAt || null,
      version: consent?.version || null,
    };
  }

  async getUserConsents(userId, tenantId = null) {
    const consents = await Consent.find({
      userId,
      tenantId,
    }).sort({ consentedAt: -1 });

    const grouped = {};
    for (const type of CONSENT_TYPES) {
      const latest = consents.find((c) => c.consentType === type);
      grouped[type] = {
        consentType: type,
        granted: latest ? latest.granted && !latest.revokedAt : false,
        consentedAt: latest?.consentedAt || null,
        revokedAt: latest?.revokedAt || null,
        version: latest?.version || null,
      };
    }

    return grouped;
  }

  async bulkUpdateConsents(userId, consentUpdates, metadata = {}) {
    const results = [];
    for (const update of consentUpdates) {
      const { consentType, granted } = update;
      try {
        let consent;
        if (granted) {
          consent = await this.grantConsent(userId, consentType, metadata);
        } else {
          consent = await this.revokeConsent(userId, consentType, {
            ...metadata,
            reason: "Bulk update",
          });
        }
        results.push({ consentType, success: true, consent });
      } catch (error) {
        results.push({ consentType, success: false, error: error.message });
      }
    }
    return results;
  }

  async getConsentHistory(userId, consentType, tenantId = null) {
    this._validateConsentType(consentType);

    return Consent.find({
      userId,
      consentType,
      tenantId,
    })
      .sort({ consentedAt: -1 })
      .lean();
  }

  async checkMultipleConsents(userId, consentTypes, tenantId = null) {
    const results = {};
    for (const type of consentTypes) {
      results[type] = await this.getConsentStatus(userId, type, tenantId);
    }
    return results;
  }

  _validateConsentType(type) {
    if (!CONSENT_TYPES.includes(type)) {
      const err = new Error(`Invalid consent type: ${type}. Valid types: ${CONSENT_TYPES.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

export default new ConsentService();
