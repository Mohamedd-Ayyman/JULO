import { config } from "../config/env.js";
import logger from "../utils/logger.js";

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection.
 * Gracefully skips if REDIS_URL is not set (dev fallback to in-memory maps).
 */
export async function initRedis() {
  if (!config.redisEnabled) {
    logger.info("[Redis] Disabled (test mode)");
    return null;
  }

  try {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    await redisClient.connect();
    isConnected = true;
    logger.info("[Redis] Connected", { url: config.redisUrl.replace(/\/\/.*@/, "//<cred>@") });

    redisClient.on("error", (err) => {
      logger.error("[Redis] Error", { error: err.message });
      isConnected = false;
    });

    redisClient.on("reconnecting", () => {
      logger.warn("[Redis] Reconnecting");
    });

    redisClient.on("ready", () => {
      isConnected = true;
      logger.info("[Redis] Ready");
    });

    return redisClient;
  } catch (err) {
    logger.warn("[Redis] Not available — caching disabled", { error: err.message });
    redisClient = null;
    isConnected = false;
    return null;
  }
}

export const redis = {
  get client() { return redisClient; },
  get ready() { return isConnected; },

  async get(key) {
    if (!isConnected) return null;
    try { return await redisClient.get(key); } catch { return null; }
  },

  async set(key, value, ttlSeconds) {
    if (!isConnected) return null;
    try {
      if (ttlSeconds) return await redisClient.setEx(key, ttlSeconds, value);
      return await redisClient.set(key, value);
    } catch { return null; }
  },

  async del(key) {
    if (!isConnected) return null;
    try { return await redisClient.del(key); } catch { return null; }
  },

  async keys(pattern) {
    if (!isConnected) return [];
    try { return await redisClient.keys(pattern); } catch { return []; }
  },

  async incr(key) {
    if (!isConnected) return null;
    try { return await redisClient.incr(key); } catch { return null; }
  },

  async expire(key, seconds) {
    if (!isConnected) return null;
    try { return await redisClient.expire(key, seconds); } catch { return null; }
  },

  async zadd(key, score, member) {
    if (!isConnected) return null;
    try { return await redisClient.zadd(key, score, member); } catch { return null; }
  },

  async zrange(key, start, stop) {
    if (!isConnected) return [];
    try { return await redisClient.zrange(key, start, stop); } catch { return []; }
  },

  async hset(key, field, value) {
    if (!isConnected) return null;
    try { return await redisClient.hset(key, field, value); } catch { return null; }
  },

  async hget(key, field) {
    if (!isConnected) return null;
    try { return await redisClient.hget(key, field); } catch { return null; }
  },

  async hgetall(key) {
    if (!isConnected) return {};
    try { return await redisClient.hgetall(key); } catch { return {}; }
  },

  /** Increment per-user request counter; returns current count. */
  async userRateLimit(userId, endpoint, windowSeconds = 60, maxRequests = 100) {
    if (!isConnected) return { allowed: true, remaining: maxRequests };
    try {
      const key = `ratelimit:${endpoint}:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, windowSeconds + 1);
      const remaining = Math.max(0, maxRequests - count);
      return { allowed: count <= maxRequests, remaining, current: count };
    } catch { return { allowed: true, remaining: maxRequests }; }
  },
};

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info("[Redis] Closed");
  }
}