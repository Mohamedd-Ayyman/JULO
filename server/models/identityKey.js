import mongoose from "mongoose";

const identityKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    keyVersion: {
      type: Number,
      default: 1,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
  },
  { timestamps: true }
);

identityKeySchema.index({ tenantId: 1 });

export default mongoose.model("IdentityKey", identityKeySchema);
