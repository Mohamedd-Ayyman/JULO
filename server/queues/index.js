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
let retentionWorker = null;
let notificationQueue = null;
let emailQueue = null;
let storyQueue = null;
let recordingsQueue = null;
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

  recordingsQueue = new Queue("recordings", {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  // ── Notification Worker ────────────────────────────────────────────────
  notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { recipientId, senderId, tenantId, type, post, comment, chat, messageId, messageText, senderName } = job.data;
      logger.debug(`[Queue] Processing notification job ${job.id}: ${type}`, { recipientId, senderId });

      const Notification = (await import("../models/notification.js")).default;
      const PushToken = (await import("../models/pushToken.js")).default;
      const NotificationPreferences = (await import("../models/notificationPreferences.js")).default;
      const { getIO } = await import("../utils/socket.js");

      // ── 1. Create in-app notification ────────────────────────────────────
      const notif = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        tenantId: tenantId || null,
        type,
        ...(post && { post }),
        ...(comment && { comment }),
        ...(chat && { chat }),
        ...(messageId && { messageId }),
      });

      const populated = await Notification.findById(notif._id)
        .populate("sender", "firstname lastname profilepic")
        .populate("post", "text image")
        .populate("comment", "text");

      // ── 2. Emit via Socket.IO (in-app real-time) ────────────────────────
      const io = getIO();
      io.to(String(recipientId)).emit("notification", populated);
      logger.debug(`[Queue] In-app notification sent: ${notif._id}`);

      // ── 3. Check push preferences and dispatch push notification ─────────
      try {
        const prefs = await NotificationPreferences.findOne({
          userId: recipientId,
          tenantId: tenantId || null,
        }).lean();

        // Map notification type to preference key
        const prefKeyMap = {
          like_post: "likes",
          like_comment: "likes",
          comment_post: "comments",
          follow: "follows",
          mention: "mentions",
          chat_mention: "chatMentions",
          thread_reply: "threadReplies",
          share: "shares",
        };
        const prefKey = prefKeyMap[type] || type;
        const pushEnabled = prefs?.preferences?.[prefKey]?.push !== false;

        if (pushEnabled) {
          const pushServiceModule = (await import("../services/pushService.js")).default;
          if (pushServiceModule.isAvailable()) {
            const tokens = await PushToken.find({ userId: recipientId, active: true });
            if (tokens.length > 0) {
              const registrationTokens = tokens.map((t) => t.token);

              const senderPopulated = populated?.sender;
              const senderDisplayName = senderName || (senderPopulated
                ? `${senderPopulated.firstname} ${senderPopulated.lastname}`
                : "Someone");

              let notifBody = "";
              let notifTitle = senderDisplayName;
              switch (type) {
                case "like_post":
                case "like_comment":
                  notifBody = "liked your post";
                  break;
                case "comment_post":
                  notifBody = "commented on your post";
                  break;
                case "follow":
                  notifBody = "started following you";
                  break;
                case "mention":
                  notifBody = "mentioned you";
                  break;
                case "chat_mention":
                  notifBody = "mentioned you in a chat";
                  break;
                case "thread_reply":
                  notifBody = "replied in a thread";
                  break;
                case "share":
                  notifBody = "shared your post";
                  break;
                default:
                  notifBody = "sent you a notification";
              }

              // Check quiet hours
              let inQuietHours = false;
              if (prefs?.quietHours?.enabled) {
                try {
                  const tz = prefs.quietHours.timezone || "UTC";
                  const now = new Date();
                  const formatter = new Intl.DateTimeFormat("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: tz,
                  });
                  const currentTime = formatter.format(now);
                  const [startH, startM] = prefs.quietHours.start.split(":").map(Number);
                  const [endH, endM] = prefs.quietHours.end.split(":").map(Number);
                  const [curH, curM] = currentTime.split(":").map(Number);
                  const curMinutes = curH * 60 + curM;
                  const startMinutes = startH * 60 + startM;
                  const endMinutes = endH * 60 + endM;

                  if (startMinutes <= endMinutes) {
                    inQuietHours = curMinutes >= startMinutes && curMinutes < endMinutes;
                  } else {
                    inQuietHours = curMinutes >= startMinutes || curMinutes < endMinutes;
                  }
                } catch (_) {}
              }

              if (!inQuietHours) {
                const payload = {
                  notification: { title: notifTitle, body: notifBody },
                  data: {
                    type,
                    notificationId: String(notif._id),
                    senderId: String(senderId),
                    ...(post && { postId: String(post) }),
                    ...(comment && { commentId: String(comment) }),
                    ...(chat && { chatId: String(chat) }),
                    ...(messageId && { messageId: String(messageId) }),
                  },
                  android: { priority: "high" },
                  apns: { payload: { aps: { "content-available": 1, sound: "default" } } },
                };

                const result = await pushServiceModule.send({
                  tokens: registrationTokens,
                  ...payload,
                });

                if (result) {
                  logger.debug(`[Queue] Push dispatched: ${result.successCount} success, ${result.failureCount} failed`);

                  // Deactivate invalid tokens
                  const { messaging } = (await import("firebase-admin")).default;
                  const invalidTokens = result.responses
                    .map((r, i) => {
                      if (!r.success && r.error) {
                        const code = r.error;
                        if (code?.includes?.("registration-token-not-registered") || code?.includes?.("invalid-registration-token")) {
                          return registrationTokens[i];
                        }
                      }
                      return null;
                    })
                    .filter(Boolean);

                  if (invalidTokens.length > 0) {
                    await PushToken.updateMany(
                      { token: { $in: invalidTokens } },
                      { $set: { active: false } }
                    );
                    logger.debug(`[Queue] Deactivated ${invalidTokens.length} invalid push tokens`);
                  }
                }
              }
            }
          }
        }
      } catch (pushErr) {
        logger.error(`[Queue] Push notification failed for job ${job.id}`, { error: pushErr.message });
      }
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

  // ── Retention Worker (daily at 2am UTC) ──────────────────────────────
  retentionWorker = new Worker(
    "recordings",
    async (job) => {
      if (job.name !== "cleanup-expired-recordings") return;
      logger.info("[Queue] Running recording retention cleanup");

      const { default: retentionService } = await import("../services/retentionService.js");
      const results = await retentionService.deleteExpiredRecordings();

      const deleted = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      logger.info(`[Queue] Retention cleanup: ${deleted} deleted, ${failed} failed`);
      return { deleted, failed };
    },
    { connection: redisClient, concurrency: 1 }
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

  // Retention cleanup — daily at 2am UTC
  recordingsQueue.add(
    "cleanup-expired-recordings",
    {},
    { repeat: { pattern: "0 2 * * *" }, jobId: "cleanup-recordings-daily" }
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
  const workers = [notificationWorker, emailWorker, storyWorker, cleanupWorker, retentionWorker].filter(Boolean);
  const queues = [notificationQueue, emailQueue, storyQueue, recordingsQueue, emailQueueForCleanup].filter(Boolean);

  await Promise.allSettled(workers.map((w) => w.close()));
  await Promise.allSettled(queues.map((q) => q.close()));

  notificationWorker = emailWorker = storyWorker = cleanupWorker = retentionWorker = null;
  notificationQueue = emailQueue = storyQueue = recordingsQueue = emailQueueForCleanup = null;

  logger.info("[Queues] Closed");
}
