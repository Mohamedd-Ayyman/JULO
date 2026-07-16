import mongoose from "mongoose";

const oneTimePreKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    keyId: {
      type: Number,
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    privateKey: {
      type: String,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
  },
  { timestamps: true }
);

oneTimePreKeySchema.index({ userId: 1, isUsed: 1 });
oneTimePreKeySchema.index({ tenantId: 1 });

export default mongoose.model("OneTimePreKey", oneTimePreKeySchema);
