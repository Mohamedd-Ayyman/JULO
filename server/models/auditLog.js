import mongoose from "mongoose";

const AUDIT_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "share",
  "consent_grant",
  "consent_revoke",
  "login",
  "logout",
  "password_change",
  "account_deactivate",
  "account_delete",
  "block",
  "unblock",
  "report",
];

const AUDIT_RESOURCES = [
  "user",
  "post",
  "message",
  "chat",
  "consent",
  "session",
  "notification",
  "story",
  "upload",
  "billing",
  "recording",
  "call",
  "identity_key",
  "signed_pre_key",
  "pre_key",
  "encryption_session",
  "participant",
  "block",
  "report",
];

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },

    resource: {
      type: String,
      enum: AUDIT_RESOURCES,
      required: true,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, timestamp: -1 });

auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model("audit_logs", auditLogSchema);
export { AUDIT_ACTIONS, AUDIT_RESOURCES };
export default AuditLog;
