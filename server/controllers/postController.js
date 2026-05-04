import express from "express";
import postService from "../services/postService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, postCreateSchema, commentSchema } from "../utils/validate.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  requireAuth,
  tenantMiddleware,
  idempotencyMiddleware(),
  validate(postCreateSchema),
  asyncHandler(async (req, res) => {
    const post = await postService.create(req.user.userId, req.tenantId, req.body);
    res.status(201).send({ success: true, message: "Post created", data: post, statusCode: 201 });
  })
);

router.get(
  "/feed",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.getFeed({ tenantId: req.tenantId, userId: req.user.userId, ...req.query });
    res.send({ success: true, data: result.posts, total: result.total, statusCode: 200 });
  })
);

router.get(
  "/:postId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const post = await postService.getById(req.params.postId, req.tenantId);
    res.send({ success: true, data: post, statusCode: 200 });
  })
);

router.put(
  "/:postId/like",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.toggleLike(req.params.postId, req.user.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.put(
  "/:postId/share",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const post = await postService.share(req.params.postId, req.user.userId, req.tenantId, req.body?.text);
    res.status(201).send({ success: true, data: post, statusCode: 201 });
  })
);

router.delete(
  "/:postId/share",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.unshare(req.params.postId, req.user.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.delete(
  "/:postId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    await postService.delete(req.params.postId, req.user.userId);
    await invalidateCache("feed:*");
    res.send({ success: true, message: "Post deleted", statusCode: 200 });
  })
);

router.get(
  "/user/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.getUserPosts(req.params.userId, req.tenantId, req.query);
    res.send({ success: true, data: result.posts, total: result.total, statusCode: 200 });
  })
);

router.post(
  "/:postId/comment",
  requireAuth,
  tenantMiddleware,
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const comment = await postService.addComment(req.params.postId, req.user.userId, req.tenantId, req.body);
    res.status(201).send({ success: true, data: comment, statusCode: 201 });
  })
);

router.put(
  "/comment/:commentId/like",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.toggleCommentLike(req.params.commentId, req.user.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.get(
  "/:postId/comments",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const comments = await postService.getComments(req.params.postId, req.query);
    res.send({ success: true, data: comments, statusCode: 200 });
  })
);

router.get(
  "/search/query",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const result = await postService.search(q, { tenantId: req.tenantId, ...req.query });
    res.send({ success: true, data: result.posts, total: result.total, statusCode: 200 });
  })
);

router.put(
  "/:postId/bookmark",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.toggleBookmark(req.params.postId, req.user.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.get(
  "/bookmarks",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await postService.getBookmarks(req.user.userId, req.query);
    res.send({ success: true, data: result.posts, total: result.total, statusCode: 200 });
  })
);

export default router;
