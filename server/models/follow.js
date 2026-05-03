import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    following: {
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

// Prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model("follows", followSchema);
export default Follow;
