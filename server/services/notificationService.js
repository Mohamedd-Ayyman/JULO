import Notification from "../models/notification.js";
import { scopeByTenant } from "../middlewares/tenantMiddleware.js";
import logger from "../utils/logger.js";

export class NotificationService {
  async create(recipientId, senderId, tenantId, type, data = {}) {
    const notif = await Notification.create({ recipient: recipientId, sender: senderId, tenantId, type, ...data });
    const populated = await Notification.findById(notif._id)
      .populate("sender", "firstname lastname profilepic")
      .populate("post", "text image")
      .populate("comment", "text");
    return populated;
  }

  async getAll(userId, tenantId, { page = 1, limit = 30 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    let baseQuery = Notification.find({ recipient: userId });
    baseQuery = scopeByTenant(baseQuery, tenantId);

    const [notifications, unreadCount] = await Promise.all([
      baseQuery
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("sender", "firstname lastname profilepic")
        .populate("post", "text image")
        .populate("comment", "text")
        .lean(),
      scopeByTenant(Notification.countDocuments({ recipient: userId, read: false }), tenantId),
    ]);
    return { notifications, unreadCount };
  }

  async markAllRead(userId, tenantId) {
    let query = Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
    query = scopeByTenant(query, tenantId);
    await query;
    logger.info(`[Notification] All marked read for ${userId}`);
  }

  async markOneRead(notificationId, userId, tenantId) {
    let query = Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { read: true } },
      { new: true }
    );
    query = scopeByTenant(query, tenantId);
    const notif = await query;
    if (!notif) {
      const err = new Error("Notification not found");
      err.statusCode = 404;
      throw err;
    }
    return notif;
  }

  async delete(notificationId, userId, tenantId) {
    let query = Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
    query = scopeByTenant(query, tenantId);
    const result = await query;
    if (!result) {
      const err = new Error("Notification not found");
      err.statusCode = 404;
      throw err;
    }
    logger.info(`[Notification] Deleted ${notificationId}`);
  }

  async deleteUserNotifications(userId) {
    const result = await Notification.deleteMany({ recipient: userId });
    logger.info(`[Notification] Deleted ${result.deletedCount} notifications for user ${userId}`);
    return { deletedCount: result.deletedCount };
  }
}

export default new NotificationService();