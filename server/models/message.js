import mongoose from "mongoose";

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
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      default: {},
    },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });

const Message = mongoose.model("messages", messageSchema);
export default Message;