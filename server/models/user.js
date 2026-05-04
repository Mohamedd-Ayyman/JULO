import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, maxlength: 60 },
    lastname: { type: String, required: true, maxlength: 60 },
    email: { type: String, required: true, maxlength: 255 },
    password: { type: String, required: true, minlength: 8, maxlength: 128 },
    profilepic: { type: String, default: null },
    coverImage: { type: String, default: null },
    bio: { type: String, maxlength: 160, default: null },
    location: { type: String, maxlength: 80, default: null },
    website: { type: String, maxlength: 200, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },

    // ── Privacy ─────────────────────────────────────────────────────────────
    isPrivate: { type: Boolean, default: false },
    showOnlineStatus: { type: Boolean, default: true },
    allowMessageRequests: { type: Boolean, default: true },
    storyVisibility: { type: String, enum: ["everyone", "followers", "close_friends"], default: "everyone" },

    // ── Notification preferences ───────────────────────────────────────────
    notificationPrefs: {
      type: {
        messages: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        likes: { type: Boolean, default: true },
        follows: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
      default: () => ({}),
    },

    // ── Account state ──────────────────────────────────────────────────────
    isDeactivated: { type: Boolean, default: false },
    deactivatedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },

    // ── SaaS: RBAC ──────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },

    // ── SaaS: Multi-tenancy ────────────────────────────────────────────────
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },

    // ── Session management ─────────────────────────────────────────────────
    lastLogin: { type: Date, default: null },
    loginHistory: {
      type: [{
        ip: String,
        userAgent: String,
        timestamp: { type: Date, default: Date.now },
      }],
      default: [],
    },

    // ── Auth hardening ──────────────────────────────────────────────────────
    passwordChangedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ isDeactivated: 1 });

const User = mongoose.model("users", userSchema);
export default User;