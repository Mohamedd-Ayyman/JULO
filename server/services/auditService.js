import AuditLog, { AUDIT_ACTIONS, AUDIT_RESOURCES } from "../models/auditLog.js";
import logger from "../utils/logger.js";

export class AuditService {
  async logAction(userId, action, resource, resourceId = null, details = null, tenantId = null, metadata = {}) {
    this._validateAction(action);
    this._validateResource(resource);

    const log = await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      tenantId,
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      details,
      timestamp: new Date(),
    });

    logger.debug(`[Audit] ${action} on ${resource} by user=${userId}`);
    return log;
  }

  async logConsentChange(userId, consentType, granted, tenantId = null, metadata = {}) {
    return this.logAction(
      userId,
      granted ? "consent_grant" : "consent_revoke",
      "consent",
      null,
      { consentType, granted },
      tenantId,
      metadata
    );
  }

  async logDataAccess(userId, resource, resourceId, tenantId = null, metadata = {}) {
    return this.logAction(userId, "read", resource, resourceId, null, tenantId, metadata);
  }

  async getAuditLogs(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getResourceAuditTrail(resource, resourceId, tenantId = null) {
    const query = { resource, resourceId };
    if (tenantId) query.tenantId = tenantId;

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .lean();
  }

  async getUserAuditTrail(userId, tenantId = null, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { userId };
    if (tenantId) query.tenantId = tenantId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    logger.info(`[Audit] Cleaned up ${result.deletedCount} logs older than ${retentionDays} days`);
    return result.deletedCount;
  }

  async getAuditStats(tenantId = null, startDate = null) {
    const matchStage = {};
    if (tenantId) matchStage.tenantId = tenantId;
    if (startDate) matchStage.timestamp = { $gte: new Date(startDate) };

    const stats = await AuditLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { action: "$action", resource: "$resource" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return stats;
  }

  _validateAction(action) {
    if (!AUDIT_ACTIONS.includes(action)) {
      const err = new Error(`Invalid audit action: ${action}`);
      err.statusCode = 400;
      throw err;
    }
  }

  _validateResource(resource) {
    if (!AUDIT_RESOURCES.includes(resource)) {
      const err = new Error(`Invalid audit resource: ${resource}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

export default new AuditService();
