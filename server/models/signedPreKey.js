import mongoose from "mongoose";

const signedPreKeySchema = new mongoose.Schema(
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
    signature: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

signedPreKeySchema.index({ userId: 1, isActive: 1 });
signedPreKeySchema.index({ tenantId: 1 });
signedPreKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("SignedPreKey", signedPreKeySchema);
