import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";

export const notificationWorker = {
  async handle(job) {
    const { recipientId, senderId, type, data } = job.data;
    logger.debug(`[Worker] Processing notification: ${type}`, { jobId: job.id });

    // Actual notification logic (same as queue processor but reusable)
    const Notification = (await import("../models/notification.js")).default;
    const { getIO } = await import("../utils/socket.js");

    const notif = await Notification.create({ recipient: recipientId, sender: senderId, type, ...data });
    const populated = await Notification.findById(notif._id)
      .populate("sender", "firstname lastname profilepic")
      .populate("post", "text image")
      .populate("comment", "text");

    const io = getIO();
    io.to(String(recipientId)).emit("notification", populated);

    return populated;
  },
};

export const emailWorker = {
  async handle(job) {
    const { to, subject, template, data } = job.data;
    logger.info(`[Worker] Sending email: ${subject} to ${to}`);
    await new Promise((r) => setTimeout(r, 100));
    return { sent: true, to, subject };
  },
};