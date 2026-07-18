import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "like_post",
        "like_comment",
        "comment_post",
        "follow",
        "mention",
        "share",
        "chat_mention",
        "thread_reply",
        "message_reaction",
      ],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "posts",
      default: null,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comments",
      default: null,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      default: null,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("notifications", notificationSchema);
export default Notification;
