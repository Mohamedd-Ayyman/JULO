import mongoose from "mongoose";

/**
 * Tenant — a workspace/organization that owns users and resources.
 * Each tenant has its own subscription plan and feature flags.
 */
const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 128 },
    slug: { type: String, required: true, unique: true, lowercase: true, maxlength: 64 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted", "trial"],
      default: "active",
    },

    // Subscription (Stripe)
    stripeCustomerId: { type: String, default: null, sparse: true },
    stripeSubscriptionId: { type: String, default: null, sparse: true },
    subscriptionEndsAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },

    // Feature flags (overrides plan defaults)
    features: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },

    // Usage tracking
    usage: {
      members: { type: Number, default: 0 },
      posts: { type: Number, default: 0 },
      storageBytes: { type: Number, default: 0 },
    },

    // Plan limits
    limits: {
      maxMembers: { type: Number, default: 1 },
      maxPostsPerMonth: { type: Number, default: 50 },
      maxStorageBytes: { type: Number, default: 100 * 1024 * 1024 },  // 100MB
      maxChats: { type: Number, default: 5 },
      customBranding: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
    },

    // Branding
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: "#6c63ff" },

    // Billing
    billingEmail: { type: String, default: null },
    billingAddress: {
      line1: String, city: String, state: String, postal_code: String, country: String,
    },
  },
  { timestamps: true }
);

tenantSchema.index({ ownerId: 1 });
tenantSchema.index({ status: 1, "usage.members": 1 });

// Default feature flags by plan
const PLAN_FEATURES = {
  free:       { analytics: false, apiAccess: false, customBranding: false, prioritySupport: false, dataExport: false },
  starter:    { analytics: true,  apiAccess: false, customBranding: false, prioritySupport: false, dataExport: false },
  pro:        { analytics: true,  apiAccess: true,  customBranding: true,  prioritySupport: true,  dataExport: true  },
  enterprise: { analytics: true,  apiAccess: true,  customBranding: true,  prioritySupport: true,  dataExport: true  },
};

tenantSchema.methods.hasFeature = function (feature) {
  if (this.features.has(feature)) return this.features.get(feature);
  return PLAN_FEATURES[this.plan]?.[feature] ?? false;
};

tenantSchema.methods.checkLimit = function (limit, current) {
  const limitVal = typeof this.limits[limit] === "number" ? this.limits[limit] : Infinity;
  return { allowed: current < limitVal, current, limit: limitVal };
};

const Tenant = mongoose.model("tenants", tenantSchema);
export default Tenant;