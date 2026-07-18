import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
blockSchema.index({ blockedId: 1 });
blockSchema.index({ tenantId: 1, blockerId: 1 });

const Block = mongoose.model("blocks", blockSchema);
export default Block;
