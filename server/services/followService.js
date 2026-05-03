import Follow from "../models/follow.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import logger from "../utils/logger.js";

export class FollowService {
  async follow(followerId, followerTenantId, followingId) {
    if (String(followerId) === String(followingId)) {
      const err = new Error("Cannot follow yourself");
      err.statusCode = 400;
      throw err;
    }
    const target = await User.findById(followingId);
    if (!target) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const existing = await Follow.findOne({ follower: followerId, following: followingId });
    if (existing) {
      const err = new Error("Already following");
      err.statusCode = 400;
      throw err;
    }

    await Follow.create({ follower: followerId, following: followingId, tenantId: followerTenantId });

    // Queue notification job
    try {
      const { notificationQueue } = await import("../queues/index.js");
      await notificationQueue.add("send", {
        recipientId: String(followingId),
        senderId: String(followerId),
        tenantId: String(followerTenantId) || null,
        type: "follow",
      });
    } catch {
      // Fallback: inline notification if queue unavailable
      await this._createNotification(followingId, followerId, followerTenantId, "follow", {});
    }

    const [followerCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: followingId }),
      Follow.countDocuments({ follower: followerId }),
    ]);
    logger.info(`[Follow] ${followerId} followed ${followingId}`);
    return { isFollowing: true, followerCount, followingCount };
  }

  async unfollow(followerId, followingId) {
    await Follow.findOneAndDelete({ follower: followerId, following: followingId });
    const [followerCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: followingId }),
      Follow.countDocuments({ follower: followerId }),
    ]);
    return { isFollowing: false, followerCount, followingCount };
  }

  async getStatus(userId, targetId) {
    const [isFollowing, followerCount, followingCount] = await Promise.all([
      Follow.findOne({ follower: userId, following: targetId }),
      Follow.countDocuments({ following: targetId }),
      Follow.countDocuments({ follower: userId }),
    ]);
    return { isFollowing: !!isFollowing, followerCount, followingCount };
  }

  async getFollowers(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [followers, total] = await Promise.all([
      Follow.find({ following: userId })
        .skip(skip)
        .limit(Number(limit))
        .populate("follower", "firstname lastname profilepic isOnline")
        .lean(),
      Follow.countDocuments({ following: userId }),
    ]);
    return {
      users: followers.map((f) => f.follower),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getFollowing(userId, { page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [following, total] = await Promise.all([
      Follow.find({ follower: userId })
        .skip(skip)
        .limit(Number(limit))
        .populate("following", "firstname lastname profilepic isOnline")
        .lean(),
      Follow.countDocuments({ follower: userId }),
    ]);
    return {
      users: following.map((f) => f.following),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async getSuggestions(userId, { limit = 5 } = {}) {
    const following = await Follow.find({ follower: userId }).select("following");
    const followingIds = following.map((f) => f.following);
    const users = await User.find({ _id: { $nin: [userId, ...followingIds] } })
      .select("firstname lastname profilepic isOnline bio")
      .limit(Number(limit))
      .lean();
    return users;
  }

  async _createNotification(recipientId, senderId, tenantId, type, data) {
    const notif = await Notification.create({ recipient: recipientId, sender: senderId, tenantId, type, ...data });
    return Notification.findById(notif._id).populate("sender", "firstname lastname profilepic");
  }
}

export default new FollowService();