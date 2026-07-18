import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group", "channel"],
      default: "direct",
      index: true,
    },
    name: {
      type: String,
      default: null,
      maxlength: 100,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    icon: {
      type: String,
      default: null,
    },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
    },
    unreadMessageCount: {
      type: Number,
      default: 0,
    },
    pinnedMessageCount: {
      type: Number,
      default: 0,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    isEncrypted: { type: Boolean, default: false },
    encryptionType: { type: String, enum: ["none", "e2e"], default: "none" },
    lastKeyRotation: { type: Date, default: null },
  },
  { timestamps: true }
);

chatSchema.index({ members: 1, updatedAt: -1 });
chatSchema.index({ tenantId: 1, archived: 1 });

const Chat = mongoose.model("chats", chatSchema);
export default Chat;