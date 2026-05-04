import { config } from "./env.js";
import logger from "../utils/logger.js";
import Redis from "ioredis";

let redisClient = null;
let _isConnected = false;

if (config.redisEnabled) {
  try {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,   // Required by BullMQ andioredis
      retryStrategy: (times) => Math.min(times * 200, 2000),
      enableOfflineQueue: true,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      logger.error("[Redis] Error", { error: err.message });
      _isConnected = false;
    });

    redisClient.on("connect", () => {
      _isConnected = true;
      const maskedUrl = typeof config.redisUrl === "string"
        ? config.redisUrl.replace(/\/\/.*@/, "//<cred>@")
        : "configured object";
      logger.info("[Redis] Connected", { url: maskedUrl });
    });

    redisClient.on("ready", () => {
      _isConnected = true;
      logger.info("[Redis] Ready");
    });

    redisClient.on("reconnecting", () => {
      logger.warn("[Redis] Reconnecting");
    });
  } catch (err) {
    logger.error("[Redis] Initialization failed", { error: err.message });
  }
}

export async function initRedis() {
  if (!config.redisEnabled || !redisClient) {
    logger.info("[Redis] Disabled or not available");
    return null;
  }

  try {
    // Only connect if not already connecting/connected
    if (redisClient.status === "wait" || redisClient.status === "close") {
      await redisClient.connect();
    }

    // Wait for the client to actually be ready to execute commands
    if (redisClient.status !== "ready") {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Redis connection timeout (5s)")), 5000);
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
    logger.warn("[Redis] Not available — caching and queues will be gracefully degraded", { error: err.message });
    return null;
  }
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    _isConnected = false;
    logger.info("[Redis] Closed");
  }
}

/**
 * Safe Redis wrapper — every method guards against null/unready client.
 * Methods always return safe defaults so Redis failures never crash requests.
 */
export const redis = {
  // ── State ──────────────────────────────────────────────────────────────────
  get client() { return redisClient; },

  /**
   * True only when the client has an active, ready connection.
   * Guards both null client and connecting/closing states.
   */
  get ready() {
    return !!(redisClient && redisClient.status === "ready");
  },

  // ── Key-value ───────────────────────────────────────────────────────────────
  async get(key) {
    if (!this.ready) return null;
    try { return await redisClient.get(key); } catch { return null; }
  },

  async set(key, value, ttlSeconds) {
    if (!this.ready) return null;
    try {
      if (ttlSeconds) return await redisClient.set(key, value, "EX", ttlSeconds);
      return await redisClient.set(key, value);
    } catch { return null; }
  },

  async del(key) {
    if (!this.ready) return null;
    try { return await redisClient.del(key); } catch { return null; }
  },

  async incr(key) {
    if (!this.ready) return null;
    try { return await redisClient.incr(key); } catch { return null; }
  },

  async expire(key, seconds) {
    if (!this.ready) return null;
    try { return await redisClient.expire(key, seconds); } catch { return null; }
  },

  // ── Set operations ──────────────────────────────────────────────────────────
  async keys(pattern) {
    if (!this.ready) return [];
    try { return await redisClient.keys(pattern); } catch { return []; }
  },

  async zadd(key, score, member) {
    if (!this.ready) return null;
    try { return await redisClient.zadd(key, score, member); } catch { return null; }
  },

  async zrange(key, start, stop) {
    if (!this.ready) return [];
    try { return await redisClient.zrange(key, start, stop); } catch { return []; }
  },

  // ── Hash operations ────────────────────────────────────────────────────────
  async hset(key, field, value) {
    if (!this.ready) return null;
    try { return await redisClient.hset(key, field, value); } catch { return null; }
  },

  async hget(key, field) {
    if (!this.ready) return null;
    try { return await redisClient.hget(key, field); } catch { return null; }
  },

  async hgetall(key) {
    if (!this.ready) return {};
    try { return await redisClient.hgetall(key); } catch { return {}; }
  },

  async hdel(key, ...fields) {
    if (!this.ready) return 0;
    try { return await redisClient.hdel(key, ...fields); } catch { return 0; }
  },

  async hlen(key) {
    if (!this.ready) return 0;
    try { return await redisClient.hlen(key); } catch { return 0; }
  },

  // ── Rate limiting ───────────────────────────────────────────────────────────
  /**
   * Increment per-user request counter; returns current count.
   * NEVER throws — Redis unavailability always returns { allowed: true }.
   */
  async userRateLimit(userId, endpoint, windowSeconds = 60, maxRequests = 100) {
    if (!this.ready) return { allowed: true, remaining: maxRequests };

    try {
      const key = `ratelimit:${endpoint}:${userId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, windowSeconds + 1);
      const remaining = Math.max(0, maxRequests - count);
      return { allowed: count <= maxRequests, remaining, current: count };
    } catch {
      // Redis error mid-operation — fail open so real users aren't blocked by infrastructure
      return { allowed: true, remaining: maxRequests };
    }
  },
};
