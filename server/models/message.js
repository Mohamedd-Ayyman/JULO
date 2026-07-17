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
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent", index: true },
    read: { type: Boolean, default: false },
    readBy: { type: [readReceiptSchema], default: [] },
    deliveredTo: { type: [readReceiptSchema], default: [] },
    edited: { type: Boolean, default: false },
    editHistory: [{
      text: { type: String, required: true },
      editedAt: { type: Date, default: Date.now },
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      _id: false,
    }],
    editCount: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    pinnedAt: { type: Date, default: null },
    mentions: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      default: [],
    },
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
    spamFlag: { type: Boolean, default: false },
    spamScore: { type: Number, default: 0 },
    spamReasons: { type: [String], default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, pinned: 1, pinnedAt: -1 });
messageSchema.index({ threadRootId: 1, createdAt: 1 });
messageSchema.index({ chatId: 1, replyTo: 1 });
messageSchema.index({ mentions: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, status: 1 });
messageSchema.index({ "deliveredTo.userId": 1 });
messageSchema.index({ "readBy.userId": 1 });
messageSchema.index({ spamFlag: 1 });

const Message = mongoose.model("messages", messageSchema);
export default Message;