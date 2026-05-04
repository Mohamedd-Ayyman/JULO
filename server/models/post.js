import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    text: { type: String, required: true, maxlength: 500 },
    image: { type: String, default: null },
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }], default: [] },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    isRepost: { type: Boolean, default: false },
    isQuote: { type: Boolean, default: false },
    originalPost: { type: mongoose.Schema.Types.ObjectId, ref: "posts", default: null },
    tags: { type: [String], default: [], index: true },
    visibility: { type: String, enum: ["public", "followers", "private"], default: "public" },
    savedBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }], default: [] },
  },
  { timestamps: true }
);

// Compound indexes — ordered from most selective to least
postSchema.index({ tenantId: 1, visibility: 1, createdAt: -1 });             // scoped feed queries
postSchema.index({ author: 1, createdAt: -1 });                               // user posts
postSchema.index({ "originalPost.author": 1 });                               // repost lookups
postSchema.index({ originalPost: 1, author: 1, isRepost: 1, isQuote: 1 });       // quick echo checks
postSchema.index({ _id: 1, createdAt: -1 });                                 // cursor pagination
postSchema.index({ tags: 1, createdAt: -1 });                                 // tag-based feeds

// Background 2dsphere index only if geo search is needed
// postSchema.index({ location: "2dsphere" });  // future geo feature

const Post = mongoose.model("posts", postSchema);
export default Post;
