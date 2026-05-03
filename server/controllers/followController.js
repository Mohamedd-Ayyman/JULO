import express from "express";
import followService from "../services/followService.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";

const router = express.Router();

router.post(
  "/follow/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await followService.follow(req.user.userId, req.tenantId, req.params.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.delete(
  "/unfollow/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await followService.unfollow(req.user.userId, req.params.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.get(
  "/status/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await followService.getStatus(req.user.userId, req.params.userId);
    res.send({ success: true, data: result, statusCode: 200 });
  })
);

router.get(
  "/followers/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await followService.getFollowers(req.params.userId, req.query);
    res.send({ success: true, data: result.users, total: result.total, statusCode: 200 });
  })
);

router.get(
  "/following/:userId",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const result = await followService.getFollowing(req.params.userId, req.query);
    res.send({ success: true, data: result.users, total: result.total, statusCode: 200 });
  })
);

router.get(
  "/suggestions",
  requireAuth,
  tenantMiddleware,
  asyncHandler(async (req, res) => {
    const users = await followService.getSuggestions(req.user.userId, req.query);
    res.send({ success: true, data: users, statusCode: 200 });
  })
);

export default router;