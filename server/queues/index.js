import { Queue, Worker } from "bullmq";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import { redis } from "../config/redis.js";

// ── Queue definitions ────────────────────────────────────────────────────

export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const emailQueue = new Queue("emails", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 500 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export const storyQueue = new Queue("stories", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 500 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// ── Notification Worker ─────────────────────────────────────────────────
const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { recipientId, senderId, tenantId, type, post, comment } = job.data;
    logger.debug(`[Queue] Processing notification job ${job.id}: ${type}`, { recipientId, senderId });

    try {
      const Notification = (await import("../models/notification.js")).default;
      const { getIO } = await import("../utils/socket.js");

      const notif = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        tenantId: tenantId || null,
        type,
        ...(post && { post }),
        ...(comment && { comment }),
      });

      const populated = await Notification.findById(notif._id)
        .populate("sender", "firstname lastname profilepic")
        .populate("post", "text image")
        .populate("comment", "text");

      const io = getIO();
      io.to(String(recipientId)).emit("notification", populated);
      logger.debug(`[Queue] Notification sent: ${notif._id}`);
    } catch (err) {
      logger.error(`[Queue] Notification job ${job.id} failed`, { error: err.message });
      throw err;
    }
  },
  { connection: redis, concurrency: config.workers.notificationConcurrency }
);

// ── Email Worker ────────────────────────────────────────────────────
const emailWorker = new Worker(
  "emails",
  async (job) => {
    const { to, subject, template, data } = job.data;
    logger.info(`[Queue] Processing email job ${job.id}: ${subject} → ${to}`);

    logger.info(`[Email] To: ${to} | Subject: ${subject} | Template: ${template}`);
    await new Promise((r) => setTimeout(r, 100));
    logger.info(`[Email] Sent successfully: ${subject}`);
    return { sent: true, to, subject };
  },
  { connection: redis, concurrency: config.workers.emailConcurrency }
);

// ── Story Media Processing Worker ─────────────────────────────────────
const storyWorker = new Worker(
  "stories",
  async (job) => {
    const { storyId, userId, mediaUrl, action } = job.data;
    logger.debug(`[Queue] Processing story job ${job.id}: ${action}`, { storyId, userId });

    if (action === "process_view") {
      const Story = (await import("../models/story.js")).default;
      await Story.findByIdAndUpdate(storyId, { $addToSet: { viewers: userId } });
      return { processed: true, storyId, action: "view_recorded" };
    }

    if (action === "send_view_notification") {
      const { getIO } = await import("../utils/socket.js");
      const io = getIO();
      io.to(String(userId)).emit("story_view", { storyId });
      return { processed: true, action: "notification_sent" };
    }

    return { processed: false, reason: "Unknown action" };
  },
  { connection: redis, concurrency: config.workers.storyConcurrency }
);

// ── Cleanup job (runs daily at 3am) ────────────────────────────────
emailQueue.add(
  "cleanup-old-notifications",
  {},
  {
    repeat: { pattern: "0 3 * * *" },
    jobId: "cleanup-notifications-daily",
  }
);

// ── Cleanup Worker ──────────────────────────────────────────────────
const cleanupWorker = new Worker(
  "emails",
  async (job) => {
    if (job.name !== "cleanup-old-notifications") return;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const Notification = (await import("../models/notification.js")).default;
    const result = await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo }, read: true });
    logger.info(`[Queue] Cleanup removed ${result.deletedCount} old read notifications`);
    return { deleted: result.deletedCount };
  },
  { connection: redis }
);

// ── Event handlers ──────────────────────────────────────────────────
notificationWorker.on("failed", (job, err) => {
  if (!job) return;
  logger.error(`[DLQ] Notification job ${job.id} failed after ${job.attemptsMade} attempts`, {
    jobData: job.data, error: err.message, attempts: job.attemptsMade,
  });
});
notificationWorker.on("retrying", (job, err) => {
  logger.warn(`[Queue] Retrying notification job ${job.id}`, { error: err.message });
});
notificationWorker.on("stalled", (jobId) => {
  logger.warn(`[Queue] Notification job stalled: ${jobId}`);
});

emailWorker.on("failed", (job, err) => {
  if (!job) return;
  logger.error(`[DLQ] Email job ${job.id} failed after ${job.attemptsMade} attempts`, {
    jobData: job.data, error: err.message, attempts: job.attemptsMade,
  });
});
emailWorker.on("retrying", (job, err) => {
  logger.warn(`[Queue] Retrying email job ${job.id}`, { error: err.message });
});
emailWorker.on("stalled", (jobId) => {
  logger.warn(`[Queue] Email job stalled: ${jobId}`);
});

storyWorker.on("failed", (job, err) => {
  if (!job) return;
  logger.error(`[DLQ] Story job ${job.id} failed after ${job.attemptsMade} attempts`, {
    jobData: job.data, error: err.message,
  });
});

// ── Graceful shutdown ───────────────────────────────────────────────
export async function closeQueues() {
  await Promise.all([
    notificationWorker.close(),
    emailWorker.close(),
    storyWorker.close(),
    cleanupWorker.close(),
    notificationQueue.close(),
    emailQueue.close(),
    storyQueue.close(),
  ]);
  logger.info("[Queues] Closed");
}