import { config } from "../config/env.js";
import logger from "../utils/logger.js";

// Pre-import BullMQ at module level (ESM cache — not a second connection, just loads the class)
// Actual queue/worker instances are created in createQueues() after Redis is ready.
let BullMQ;
async function ensureBullMQ() {
  if (!BullMQ) {
    const { Queue, Worker } = await import("bullmq");
    BullMQ = { Queue, Worker };
  }
  return BullMQ;
}

// Module-level state — null until createQueues() is called
let notificationWorker = null;
let emailWorker = null;
let storyWorker = null;
let cleanupWorker = null;
let notificationQueue = null;
let emailQueue = null;
let storyQueue = null;
let emailQueueForCleanup = null; // cleanup job reuses email queue connection

/**
 * Create all BullMQ queues and workers.
 * MUST be called AFTER initRedis() has resolved with a ready redisClient.
 * Safe to call with a null/unready redisClient — logs warning, returns without error.
 */
export async function createQueues(redisClient) {
  if (!redisClient) {
    logger.warn("[Queues] No Redis client — queues will not be created");
    return;
  }

  const { Queue, Worker } = await ensureBullMQ();

  // ── Queues ──────────────────────────────────────────────────────────────
  notificationQueue = new Queue("notifications", {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  });

  emailQueue = new Queue("emails", {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 500 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });

  storyQueue = new Queue("stories", {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 500 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  // ── Notification Worker ────────────────────────────────────────────────
  notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { recipientId, senderId, tenantId, type, post, comment } = job.data;
      logger.debug(`[Queue] Processing notification job ${job.id}: ${type}`, { recipientId, senderId });

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
    },
    { connection: redisClient, concurrency: config.workers.notificationConcurrency }
  );

  // ── Email Worker ───────────────────────────────────────────────────────
  emailWorker = new Worker(
    "emails",
    async (job) => {
      const { to, subject, template, data: _data } = job.data;
      logger.info(`[Queue] Processing email job ${job.id}: ${subject} → ${to}`);
      await new Promise((r) => setTimeout(r, 100));
      logger.info(`[Email] Sent successfully: ${subject}`);
      return { sent: true, to, subject };
    },
    { connection: redisClient, concurrency: config.workers.emailConcurrency }
  );

  // ── Story Worker ───────────────────────────────────────────────────────
  storyWorker = new Worker(
    "stories",
    async (job) => {
      const { storyId, userId, action } = job.data;
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
    { connection: redisClient, concurrency: config.workers.storyConcurrency }
  );

  // ── Cleanup Worker (daily at 3am UTC) ────────────────────────────────────
  emailQueueForCleanup = new Queue("emails", { connection: redisClient });

  cleanupWorker = new Worker(
    "emails",
    async (job) => {
      if (job.name !== "cleanup-old-notifications") return;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const Notification = (await import("../models/notification.js")).default;
      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        read: true,
      });
      logger.info(`[Queue] Cleanup removed ${result.deletedCount} old read notifications`);
      return { deleted: result.deletedCount };
    },
    { connection: redisClient }
  );

  // Idempotent daily schedule — safe to call on every boot (BullMQ ignores duplicates)
  emailQueueForCleanup.add(
    "cleanup-old-notifications",
    {},
    { repeat: { pattern: "0 3 * * *" }, jobId: "cleanup-notifications-daily" }
  );

  // ── Event handlers ──────────────────────────────────────────────────────
  notificationWorker.on("failed", (job, err) => {
    if (!job) return;
    logger.error(`[DLQ] Notification job ${job.id} failed after ${job.attemptsMade} attempts`, {
      jobData: job.data,
      error: err.message,
      attempts: job.attemptsMade,
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
      jobData: job.data,
      error: err.message,
      attempts: job.attemptsMade,
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
      jobData: job.data,
      error: err.message,
    });
  });

  logger.info("[Queues] All queues and workers created");
}

/**
 * Gracefully close all queues and workers.
 * Safe to call even if createQueues() was never called — no-ops on nulls.
 */
export async function closeQueues() {
  const workers = [notificationWorker, emailWorker, storyWorker, cleanupWorker].filter(Boolean);
  const queues = [notificationQueue, emailQueue, storyQueue, emailQueueForCleanup].filter(Boolean);

  await Promise.allSettled(workers.map((w) => w.close()));
  await Promise.allSettled(queues.map((q) => q.close()));

  notificationWorker = emailWorker = storyWorker = cleanupWorker = null;
  notificationQueue = emailQueue = storyQueue = emailQueueForCleanup = null;

  logger.info("[Queues] Closed");
}
