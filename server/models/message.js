import mongoose from "mongoose";

const readReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "chats", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
      default: null,
      index: true,
    },
    threadRootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
      default: null,
      index: true,
    },
    threadReplyCount: {
      type: Number,
      default: 0,
    },
    text: { type: String, default: "" },
    audioUrl: { type: String, default: null },
    audioDuration: { type: Number, default: null },
    imageUrl: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    mimeType: { type: String, default: null },
    linkPreview: {
      type: {
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        image: { type: String, default: "" },
        url: { type: String, default: "" },
        siteName: { type: String, default: "" },
      },
      default: null,
    },
    encryptedContent: { type: String, default: null },
    iv: { type: String, default: null },
    authTag: { type: String, default: null },
    keyId: { type: String, default: null },
    ephemeralPublicKey: { type: String, default: null },
    ratchetStep: { type: Number, default: 0 },
    messageType: { type: String, enum: ["text", "encrypted", "file", "system", "key_exchange"], default: "text" },
    read: { type: Boolean, default: false },
    readBy: { type: [readReceiptSchema], default: [] },
    deliveredTo: { type: [readReceiptSchema], default: [] },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    pinnedAt: { type: Date, default: null },
    forwardedFrom: {
      type: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: "messages" },
        chatId: { type: mongoose.Schema.Types.ObjectId, ref: "chats" },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      },
      default: null,
    },
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      default: {},
    },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, _id: -1 });
messageSchema.index({ chatId: 1, pinned: 1, pinnedAt: -1 });
messageSchema.index({ threadRootId: 1, createdAt: 1 });
messageSchema.index({ chatId: 1, replyTo: 1 });

const Message = mongoose.model("messages", messageSchema);
export default Message;