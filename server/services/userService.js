import User from "../models/user.js";
import logger from "../utils/logger.js";

export class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    // Exclude deactivated accounts from being shown
    if (user.isDeactivated && user.deactivatedAt) {
      // Return minimal info so the UI can show "Account unavailable"
      user.firstname = "Deleted";
      user.lastname = "Account";
      user.profilepic = null;
      user.bio = null;
    }
    return user;
  }

  async getAllUsers(currentUserId, { page = 1, limit = 50 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find({ _id: { $ne: currentUserId }, isDeactivated: { $ne: true } })
        .select("firstname lastname email profilepic isOnline lastSeen bio")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments({ _id: { $ne: currentUserId }, isDeactivated: { $ne: true } }),
    ]);
    return { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async updateProfile(userId, fields) {
    // Only allow safe non-sensitive fields to be updated directly
    const allowed = [
      "firstname", "lastname", "bio", "coverImage",
      "location", "website", "email",
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (fields[k] !== undefined) updates[k] = fields[k];
    });

    if (Object.keys(updates).length === 0) {
      const err = new Error("No valid fields to update");
      err.statusCode = 400;
      throw err;
    }

    const updated = await User.findByIdAndUpdate(userId, updates, { new: true, select: "-password" });
    if (!updated) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    logger.info(`[User] Profile updated: ${userId}`);
    return updated;
  }

  async searchUsers(currentUserId, { q, page = 1, limit = 20 } = {}) {
    if (!q) return { users: [], total: 0 };

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find({
        _id: { $ne: currentUserId },
        isDeactivated: { $ne: true },
        $or: [
          { firstname: { $regex: q, $options: "i" } },
          { lastname: { $regex: q, $options: "i" } },
          { bio: { $regex: q, $options: "i" } },
        ],
      })
        .select("firstname lastname profilepic isOnline bio")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments({
        _id: { $ne: currentUserId },
        isDeactivated: { $ne: true },
        $or: [
          { firstname: { $regex: q, $options: "i" } },
          { lastname: { $regex: q, $options: "i" } },
          { bio: { $regex: q, $options: "i" } },
        ],
      }),
    ]);
    return { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async setOnlineStatus(userId, isOnline) {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      ...(isOnline ? {} : { lastSeen: new Date() }),
    });
  }

  async getActiveSessionList(userId) {
    return User.findById(userId).select("loginHistory").lean();
  }
}

export default new UserService();