import mongoose from "mongoose";
import crypto from "crypto";

/**
 * Session — one per refresh token (one per device/session).
 *
 * Access tokens are stateless JWTs (never stored).
 * Refresh tokens are stored as SHA-256 hashes (never stored in plain text).
 * On logout, the refresh token hash is invalidated immediately.
 * On token rotation, the old refresh token is invalidated atomically.
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },

    // SHA-256 hash of the raw refresh token
    tokenHash: { type: String, required: true, index: true },

    // Token family: same-family tokens form a rotation chain.
    // A refresh with a revoked parent token invalidates the entire family.
    tokenFamily: { type: String, default: () => crypto.randomUUID() },

    // Device / session metadata
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    deviceType: { type: String, default: "unknown" },  // mobile / desktop / tablet / other

    // Refresh token rotation tracking
    rotationCount: { type: Number, default: 1 },

    // ── Lifecycle ──────────────────────────────────────────────────────────
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },  // "logout" | "refresh" | "expired" | "security"
  },
  { timestamps: true }
);

/** Index for fast session lookup during token refresh */
sessionSchema.index({ userId: 1, tokenHash: 1 });
/** Index for TTL cleanup (MongoDB auto-deletes expired sessions) */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
/** Index for family-based revocation (invalidate all tokens in a family) */
sessionSchema.index({ tokenFamily: 1, revokedAt: 1 });

/** Static: revoke all sessions for a user (e.g., password change, admin action) */
sessionSchema.statics.revokeAllForUser = async function (userId, reason = "security") {
  return this.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
};

/** Static: revoke a specific token family */
sessionSchema.statics.revokeFamily = async function (tokenFamily, reason = "refresh") {
  return this.updateMany(
    { tokenFamily, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
};

/** Static: revoke all sessions except current (for "logout other devices") */
sessionSchema.statics.revokeOthersForUser = async function (userId, excludeFamily, reason = "logout_others") {
  return this.updateMany(
    { userId, tokenFamily: { $ne: excludeFamily }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
};

/** Static: hash a raw token for comparison */
sessionSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

const Session = mongoose.model("sessions", sessionSchema);
export default Session;