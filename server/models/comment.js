import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "posts", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    text: { type: String, required: true, maxlength: 280 },
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }], default: [] },
    likeCount: { type: Number, default: 0 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "comments", default: null },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

const Comment = mongoose.model("comments", commentSchema);
export default Comment;