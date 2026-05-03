import express from "express";
import streamifier from "streamifier";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/upload.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/user.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { config } from "../config/env.js";
import { invalidateCache } from "../middlewares/cacheMiddleware.js";

const router = express.Router();

const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);

/**
 * uploadToCloudinary — streams buffer to Cloudinary for fast in-memory upload.
 * Returns { secure_url } on success.
 */
const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) return reject(new AppError("Cloudinary is not configured", 500));
    const stream = cloudinary.uploader.upload_stream(
      { folder: config.cloudinary.folder, ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * POST /api/upload/avatar
 *
 * Uploads user avatar.
 * Flow:
 *   1. Receive file via multer (buffer or Cloudinary stream)
 *   2. Upload to Cloudinary (or use temp path for local dev)
 *   3. Update user doc in MongoDB
 *   4. Bust user cache entries
 *   5. Return URL immediately (no background queue needed for avatars — fast by design)
 */
router.post(
  "/avatar",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No image provided", 400);

    // Fast path: direct Cloudinary URL from path (already stored by multer-storage-cloudinary)
    // Slow path: stream buffer manually (used when path not available)
    let imageUrl;
    if (req.file.path) {
      imageUrl = req.file.path;
    } else if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer, { transformation: [{ width: 400, height: 400, crop: "fill", radius: "max" }] });
      imageUrl = result.secure_url;
    } else {
      // Development fallback — use a placeholder
      imageUrl = `https://picsum.photos/seed/${req.user.userId}/400/400`;
    }

    // Update user document
    await User.findByIdAndUpdate(req.user.userId, { profilepic: imageUrl });

    // Bust all related user caches so new avatar propagates instantly
    await invalidateCache(`user:me:${req.user.userId}`);
    await invalidateCache(`user:*:${req.user.userId}:*`);

    res.send({
      success: true,
      url: imageUrl,
      message: "Avatar updated",
      statusCode: 200,
    });
  })
);

/**
 * POST /api/upload/cover
 *
 * Uploads cover image for user profile.
 */
router.post(
  "/cover",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No image provided", 400);

    let imageUrl;
    if (req.file.path) {
      imageUrl = req.file.path;
    } else if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer, { transformation: [{ width: 1200, height: 400, crop: "crop" }] });
      imageUrl = result.secure_url;
    } else {
      imageUrl = `https://picsum.photos/seed/cover-${req.user.userId}/1200/400`;
    }

    await User.findByIdAndUpdate(req.user.userId, { coverImage: imageUrl });
    await invalidateCache(`user:me:${req.user.userId}`);
    await invalidateCache(`user:*:${req.user.userId}:*`);

    res.send({ success: true, url: imageUrl, message: "Cover updated", statusCode: 200 });
  })
);

/**
 * POST /api/upload/post-image
 *
 * Uploads an image attached to a post.
 */
router.post(
  "/post-image",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No image provided", 400);

    let imageUrl;
    if (req.file.path) {
      imageUrl = req.file.path;
    } else if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    } else {
      imageUrl = `https://picsum.photos/seed/post-${Date.now()}/800/600`;
    }

    res.send({ success: true, url: imageUrl, message: "Image uploaded", statusCode: 201 });
  })
);

/**
 * POST /api/upload/story
 *
 * Uploads a story media file.
 * Returns immediately — lightweight, no background processing needed.
 */
router.post(
  "/story",
  requireAuth,
  upload.single("media"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No media provided", 400);

    let mediaUrl;
    if (req.file.path) {
      mediaUrl = req.file.path;
    } else if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer, {
        transformation: [{ width: 1080, height: 1920, crop: "fill" }],
      });
      mediaUrl = result.secure_url;
    } else {
      mediaUrl = `https://picsum.photos/seed/story-${Date.now()}/540/960`;
    }

    res.send({ success: true, url: mediaUrl, mediaType: req.file.mimetype?.startsWith("video") ? "video" : "image", statusCode: 201 });
  })
);

export default router;