import mongoose from "mongoose";

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
    },
    // Per-type channel preferences: { push: bool, inApp: bool, email: bool }
    preferences: {
      type: {
        messages: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        comments: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        likes: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        follows: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        mentions: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
        },
        threadReplies: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        chatMentions: {
          push: { type: Boolean, default: true },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        shares: {
          push: { type: Boolean, default: false },
          inApp: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
        },
        marketing: {
          push: { type: Boolean, default: false },
          inApp: { type: Boolean, default: false },
          email: { type: Boolean, default: false },
        },
      },
      default: () => ({}),
    },
    // Quiet hours
    quietHours: {
      type: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: "22:00" },  // HH:mm
        end: { type: String, default: "08:00" },    // HH:mm
        timezone: { type: String, default: "UTC" },
      },
      default: null,
    },
  },
  { timestamps: true }
);

notificationPreferencesSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

const NotificationPreferences = mongoose.model("notification_preferences", notificationPreferencesSchema);
export default NotificationPreferences;
