import mongoose from "mongoose";

const encryptionSessionSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionData: {
      type: String,
      required: true,
    },
    messageNumber: {
      type: Number,
      default: 0,
    },
    previousChainLength: {
      type: Number,
      default: 0,
    },
    rootKey: {
      type: String,
      required: true,
    },
    chainKey: {
      type: String,
      required: true,
    },
    sendingKey: {
      type: String,
      default: null,
    },
    receivingKey: {
      type: String,
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

encryptionSessionSchema.index({ chatId: 1, userId: 1 });
encryptionSessionSchema.index({ tenantId: 1 });
encryptionSessionSchema.index({ lastActiveAt: 1 });

export default mongoose.model("EncryptionSession", encryptionSessionSchema);
