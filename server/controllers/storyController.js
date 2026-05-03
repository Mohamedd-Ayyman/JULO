import express from "express";
import storyService from "../services/storyService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { cacheMiddleware, invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

// ── Create story ─────────────────────────────────────────────────────────
router.post(
  "/create",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { mediaUrl, mediaType = "image" } = req.body;
    if (!mediaUrl) throw new AppError("mediaUrl is required", 400);
    if (!["image", "video"].includes(mediaType)) throw new AppError("mediaType must be 'image' or 'video'", 400);

    const story = await storyService.createStory({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      mediaUrl,
      mediaType,
    });

    await invalidateCache("stories:*");
    res.status(201).send({ success: true, data: story, statusCode: 201 });
  })
);

// ── Get all stories (grouped by user, for feed) ─────────────────────────
router.get(
  "/",
  requireAuth,
  cacheMiddleware("stories:feed", 30),
  asyncHandler(async (req, res) => {
    const stories = await storyService.getStoriesForFeed(req.user.userId);
    res.send({ success: true, data: stories, statusCode: 200 });
  })
);

// ── Get my stories (for story creation UI) ──────────────────────────────
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const stories = await storyService.getMyStories(req.user.userId);
    res.send({ success: true, data: stories, statusCode: 200 });
  })
);

// ── Mark story as viewed ────────────────────────────────────────────────
router.post(
  "/:storyId/view",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    await storyService.markViewed(storyId, req.user.userId);
    res.send({ success: true, statusCode: 200 });
  })
);

// ── Delete story ────────────────────────────────────────────────────────
router.delete(
  "/:storyId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { storyId } = req.params;
    await storyService.deleteStory(storyId, req.user.userId);
    await invalidateCache("stories:*");
    res.send({ success: true, message: "Story deleted", statusCode: 200 });
  })
);

export default router;