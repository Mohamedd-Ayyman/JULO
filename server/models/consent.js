import mongoose from "mongoose";

const CONSENT_TYPES = [
  "recording",
  "location_sharing",
  "analytics",
  "marketing",
  "third_party_sharing",
  "data_processing",
  "push_notifications",
  "profile_indexing",
];

const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    consentType: {
      type: String,
      enum: CONSENT_TYPES,
      required: true,
    },

    granted: {
      type: Boolean,
      required: true,
    },

    version: {
      type: String,
      required: true,
      default: "1.0",
    },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    consentedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, maxlength: 500, default: null },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

consentSchema.index({ userId: 1, consentType: 1, tenantId: 1 });
consentSchema.index({ userId: 1, consentType: 1, granted: 1 });
consentSchema.index({ tenantId: 1, consentType: 1 });

const Consent = mongoose.model("consents", consentSchema);
export { CONSENT_TYPES };
export default Consent;
