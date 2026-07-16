import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      required: true,
      index: true,
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
    isEncrypted: { type: Boolean, default: false },
    encryptionType: { type: String, enum: ["none", "e2e"], default: "none" },
    lastKeyRotation: { type: Date, default: null },
  },
  { timestamps: true }
);

const Chat = mongoose.model("chats", chatSchema);
export default Chat;