import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
    },
    nickname: {
      type: String,
      default: null,
      maxlength: 50,
    },
    muted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
      default: null,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
    },
  },
  { timestamps: true }
);

participantSchema.index({ chatId: 1, userId: 1 }, { unique: true });
participantSchema.index({ userId: 1, archived: 1, pinned: -1 });
participantSchema.index({ tenantId: 1 });
participantSchema.index({ chatId: 1, isDeleted: 1 });

export default mongoose.model("participants", participantSchema);
