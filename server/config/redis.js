import { config } from "./env.js";
import logger from "../utils/logger.js";
import Redis from "ioredis";

let redisClient = null;
let isConnected = false;

// Initialize the client instance immediately if enabled, so it can be exported
// and used by other modules (like BullMQ) even before the connection is established.
if (config.redisEnabled) {
  try {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: (times) => Math.min(times * 200, 2000),
      enableOfflineQueue: true,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      logger.error("[Redis] Error", { error: err.message });
      isConnected = false;
    });

    redisClient.on("connect", () => {
      isConnected = true;
      const maskedUrl = typeof config.redisUrl === "string" 
        ? config.redisUrl.replace(/\/\/.*@/, "//<cred>@")
        : "configured object";
      logger.info("[Redis] Connected", { url: maskedUrl });
    });

    redisClient.on("ready", () => {
      isConnected = true;
      logger.info("[Redis] Ready");
    });

    redisClient.on("reconnecting", () => {
      logger.warn("[Redis] Reconnecting");
    });
  } catch (err) {
    logger.error("[Redis] Initialization failed", { error: err.message });
  }
}

/**
 * Trigger connection to Redis.
 * This is called during the app boot sequence.
 */
export async function initRedis() {
  if (!config.redisEnabled || !redisClient) {
    logger.info("[Redis] Disabled or not available");
    return null;
  }

  try {
    if (redisClient.status === "wait" || redisClient.status === "close") {
      await redisClient.connect();
    }
    
    // Ensure the client is actually 'ready' to handle commands
    if (redisClient.status !== "ready") {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Redis connection timeout")), 5000);
        redisClient.once("ready", () => {
          clearTimeout(timeout);
          resolve();
        });
        redisClient.once("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    
    return redisClient;
  } catch (err) {
    logger.warn("[Redis] Not available — caching and queues might be limited", { error: err.message });
    return null;
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info("[Redis] Closed");
  }
}

/**
 * Exported wrapper for application-wide use.
 * For BullMQ and other libs needing the raw client, use redis.client.
 */
export const redis = {
  get client() { return redisClient; },
  get ready() { return isConnected || (redisClient && redisClient.status === "ready"); },

  async get(key) {
    if (!redisClient) return null;
    try { return await redisClient.get(key); } catch { return null; }
  },

  async set(key, value, ttlSeconds) {
    if (!redisClient) return null;
    try {
      if (ttlSeconds) return await redisClient.set(key, value, "EX", ttlSeconds);
      return await redisClient.set(key, value);
    } catch { return null; }
  },

  async del(key) {
    if (!redisClient) return null;
    try { return await redisClient.del(key); } catch { return null; }
  },

  async keys(pattern) {
    if (!redisClient) return [];
    try { return await redisClient.keys(pattern); } catch { return []; }
  },

  async incr(key) {
    if (!redisClient) return null;
    try { return await redisClient.incr(key); } catch { return null; }
  },

  async expire(key, seconds) {
    if (!redisClient) return null;
    try { return await redisClient.expire(key, seconds); } catch { return null; }
  },

  async zadd(key, score, member) {
    if (!redisClient) return null;
    try { return await redisClient.zadd(key, score, member); } catch { return null; }
  },

  async zrange(key, start, stop) {
    if (!redisClient) return [];
    try { return await redisClient.zrange(key, start, stop); } catch { return []; }
  },

  async hset(key, field, value) {
    if (!redisClient) return null;
    try { return await redisClient.hset(key, field, value); } catch { return null; }
  },

  async hget(key, field) {
    if (!redisClient) return null;
    try { return await redisClient.hget(key, field); } catch { return null; }
  },

  async hgetall(key) {
    if (!redisClient) return {};
    try { return await redisClient.hgetall(key); } catch { return {}; }
  },

  /** Increment per-user request counter; returns current count. */
  async userRateLimit(userId, endpoint, windowSeconds = 60, maxRequests = 100) {
    if (!redisClient) return { allowed: true, remaining: maxRequests };
    try {
      const key = `ratelimit:${endpoint}:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, windowSeconds + 1);
      const remaining = Math.max(0, maxRequests - count);
      return { allowed: count <= maxRequests, remaining, current: count };
    } catch { return { allowed: true, remaining: maxRequests }; }
  },
};
