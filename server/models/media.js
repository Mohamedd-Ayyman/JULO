import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      default: null,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "messages",
      default: null,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "audio", "file"],
      required: true,
      index: true,
    },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
    cdnUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    optimizedUrl: { type: String, default: null },
    signedUrl: { type: String, default: null },
    signedUrlExpiresAt: { type: Date, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null },
    metadata: {
      format: { type: String, default: null },
      bytes: { type: Number, default: 0 },
      resourceType: { type: String, default: null },
    },
    uploaded: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

mediaSchema.index({ chatId: 1, createdAt: -1 });
mediaSchema.index({ chatId: 1, mediaType: 1 });
mediaSchema.index({ uploaderId: 1, createdAt: -1 });

const Media = mongoose.model("media", mediaSchema);
export default Media;
