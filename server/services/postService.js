import Post from "../models/post.js";
import Comment from "../models/comment.js";
import Follow from "../models/follow.js";
import { scopeByTenant } from "../middlewares/tenantMiddleware.js";
import { checkUsageLimit, incrementUsage, decrementUsage } from "../middlewares/tenantMiddleware.js";
import logger from "../utils/logger.js";

export class PostService {
  async _notify(recipientId, senderId, tenantId, type, data = {}) {
    if (String(recipientId) === String(senderId)) return;
    try {
      const { notificationQueue } = await import("../queues/index.js");
      await notificationQueue.add("send", {
        recipientId: String(recipientId),
        senderId: String(senderId),
        tenantId: String(tenantId) || null,
        type,
        data,
      });
    } catch (err) {
      logger.error(`[PostService] Failed to queue notification: ${err.message}`);
    }
  }

  async create(authorId, tenantId, { text, image, tags, visibility }) {
    // Check usage limits before creating
    if (tenantId) {
      await checkUsageLimit(tenantId, "posts", 1);
    }

    const post = new Post({
      author: authorId,
      tenantId,
      text: text?.trim() || "",
      image: image || null,
      tags: tags || [],
      visibility: visibility || "public",
    });
    await post.save();

    if (tenantId) {
      await incrementUsage(tenantId, "posts", 1);
    }

    return Post.findById(post._id).populate("author", "firstname lastname profilepic isOnline");
  }

  async getFeed({ tenantId, userId, page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    let baseQuery = Post.find({ visibility: "public" });
    baseQuery = scopeByTenant(baseQuery, tenantId);

    const [posts, total, following] = await Promise.all([
      baseQuery
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("author", "firstname lastname profilepic isOnline")
        .populate({
          path: "originalPost",
          select: "author text image likeCount commentCount shareCount createdAt",
          populate: { path: "author", select: "firstname lastname profilepic" },
        })
        .lean(),
      scopeByTenant(Post.countDocuments({ visibility: "public" }), tenantId),
      userId ? Follow.find({ follower: userId }).select("following").lean() : [],
    ]);

    const followingIds = following.map((f) => f.following);
    const postIds = posts.map((p) => p._id);

    if (postIds.length > 0 && followingIds.length > 0) {
      const previewComments = await Comment.find({
        post: { $in: postIds },
        author: { $in: followingIds },
      })
        .sort({ createdAt: -1 })
        .populate("author", "firstname lastname profilepic isOnline")
        .lean();

      const previewMap = new Map();
      previewComments.forEach((c) => {
        const key = String(c.post);
        if (!previewMap.has(key)) previewMap.set(key, c);
      });

      posts.forEach((post) => {
        const preview = previewMap.get(String(post._id));
        post.commentsPreview = preview ? [preview] : [];
      });
    } else {
      posts.forEach((post) => {
        post.commentsPreview = [];
      });
    }
    return { posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async getById(postId, tenantId) {
    let query = Post.findById(postId);
    query = scopeByTenant(query, tenantId);
    const post = await query
      .populate("author", "firstname lastname profilepic isOnline")
      .populate({
        path: "originalPost",
        select: "author text image likeCount commentCount",
        populate: { path: "author", select: "firstname lastname profilepic" },
      });
    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    return post;
  }

  async toggleLike(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }

    const idx = post.likes.findIndex((l) => String(l) === String(userId));
    if (idx > -1) {
      post.likes.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likes.push(userId);
      post.likeCount += 1;
      // Notify author
      this._notify(post.author, userId, post.tenantId, "like_post", { post: post._id });
    }
    await post.save();
    return { liked: idx === -1, likeCount: post.likeCount };
  }

  async share(postId, userId, tenantId, text) {
    const original = await Post.findById(postId);
    if (!original) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }

    let baseOriginal = original;
    while (baseOriginal.isRepost && baseOriginal.originalPost && !baseOriginal.isQuote) {
      const parent = await Post.findById(baseOriginal.originalPost);
      if (!parent) break;
      baseOriginal = parent;
    }

    const cleanedText = typeof text === "string" ? text.trim() : "";
    const isQuickEcho = !cleanedText;

    if (isQuickEcho) {
      const existingQuick = await Post.findOne({
        originalPost: baseOriginal._id,
        author: userId,
        isRepost: true,
        isQuote: false,
      }).select("_id");
      if (existingQuick) {
        const err = new Error("Already echoed this post");
        err.statusCode = 409;
        throw err;
      }
    }

    const repost = new Post({
      author: userId,
      tenantId,
      text: isQuickEcho ? baseOriginal.text : cleanedText,
      image: baseOriginal.image,
      isRepost: true,
      isQuote: !isQuickEcho,
      originalPost: baseOriginal._id,
      visibility: "public",
    });
    await repost.save();
    baseOriginal.shareCount += 1;
    await baseOriginal.save();

    // Notify original author
    this._notify(baseOriginal.author, userId, tenantId, "share", { post: repost._id });

    return Post.findById(repost._id)
      .populate("author", "firstname lastname profilepic isOnline")
      .populate({
        path: "originalPost",
        select: "author text image likeCount commentCount shareCount createdAt",
        populate: { path: "author", select: "firstname lastname profilepic" },
      });
  }

  async unshare(postId, userId) {
    const original = await Post.findById(postId);
    if (!original) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }

    const baseOriginal = original.originalPost
      ? await Post.findById(original.originalPost)
      : original;

    if (!baseOriginal) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }

    const repost = await Post.findOne({
      originalPost: baseOriginal._id,
      author: userId,
      isRepost: true,
      isQuote: false,
    });

    if (!repost) {
      const err = new Error("Echo not found");
      err.statusCode = 404;
      throw err;
    }

    await Comment.deleteMany({ post: repost._id });
    await Post.findByIdAndDelete(repost._id);

    baseOriginal.shareCount = Math.max(0, (baseOriginal.shareCount || 0) - 1);
    await baseOriginal.save();

    if (repost.tenantId) {
      await decrementUsage(repost.tenantId, "posts", 1).catch(() => {});
    }

    return { repostId: repost._id, shareCount: baseOriginal.shareCount };
  }

  async delete(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    if (String(post.author) !== String(userId)) {
      const err = new Error("Not authorized to delete this post");
      err.statusCode = 403;
      throw err;
    }
    await Comment.deleteMany({ post: postId });
    await Post.findByIdAndDelete(postId);
    if (post.tenantId) {
      await decrementUsage(post.tenantId, "posts", 1).catch(() => {});
    }
    logger.info(`[Post] Deleted: ${postId} by ${userId}`);
  }

  async getUserPosts(userId, tenantId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    let baseQuery = Post.find({ author: userId });
    baseQuery = scopeByTenant(baseQuery, tenantId);
    const [posts, total] = await Promise.all([
      baseQuery
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("author", "firstname lastname profilepic isOnline")
        .populate({
          path: "originalPost",
          select: "author text image likeCount commentCount shareCount createdAt",
          populate: { path: "author", select: "firstname lastname profilepic" },
        })
        .lean(),
      scopeByTenant(Post.countDocuments({ author: userId }), tenantId),
    ]);
    return { posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async addComment(postId, userId, tenantId, { text, parentComment }) {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }

    const comment = new Comment({
      post: postId,
      author: userId,
      tenantId,
      text,
      parentComment: parentComment || null,
    });
    await comment.save();
    post.commentCount += 1;
    await post.save();

    // Notify post author
    this._notify(post.author, userId, tenantId, "comment_post", { post: post._id, comment: comment._id });

    return Comment.findById(comment._id).populate("author", "firstname lastname profilepic isOnline");
  }

  async toggleCommentLike(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      const err = new Error("Comment not found");
      err.statusCode = 404;
      throw err;
    }

    const idx = comment.likes.findIndex((l) => String(l) === String(userId));
    if (idx > -1) {
      comment.likes.splice(idx, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      comment.likes.push(userId);
      comment.likeCount += 1;
    }
    await comment.save();
    return { liked: idx === -1, likeCount: comment.likeCount };
  }

  async getComments(postId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const comments = await Comment.find({ post: postId, parentComment: null })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("author", "firstname lastname profilepic isOnline")
      .lean();

    const commentsWithReplies = await Promise.all(
      comments.map(async (c) => {
        const replies = await Comment.find({ parentComment: c._id })
          .sort({ createdAt: 1 })
          .populate("author", "firstname lastname profilepic isOnline")
          .lean();
        return { ...c, replies };
      })
    );
    return commentsWithReplies;
  }

  async search(query, { page = 1, limit = 20 } = {}) {
    if (!query) return { posts: [], total: 0 };
    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      Post.find({ text: { $regex: query, $options: "i" }, visibility: "public" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("author", "firstname lastname profilepic isOnline")
        .populate({
          path: "originalPost",
          select: "author text image likeCount commentCount shareCount createdAt",
          populate: { path: "author", select: "firstname lastname profilepic" },
        })
        .lean(),
      Post.countDocuments({ text: { $regex: query, $options: "i" }, visibility: "public" }),
    ]);
    return { posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async toggleBookmark(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    const idx = post.savedBy.findIndex((u) => String(u) === String(userId));
    if (idx > -1) post.savedBy.splice(idx, 1);
    else post.savedBy.push(userId);
    await post.save();
    return { bookmarked: idx === -1 };
  }

  async getBookmarks(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      Post.find({ savedBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("author", "firstname lastname profilepic isOnline")
        .populate({
          path: "originalPost",
          select: "author text image likeCount commentCount shareCount createdAt",
          populate: { path: "author", select: "firstname lastname profilepic" },
        })
        .lean(),
      Post.countDocuments({ savedBy: userId }),
    ]);
    return { posts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }
}

export default new PostService();
