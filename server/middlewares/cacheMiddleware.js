import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Cache middleware factory.
 * Wraps a cache key + TTL around any route handler.
 *
 * @param {string} keyPrefix - e.g. "feed:page:" (userId appended automatically)
 * @param {number} ttlSeconds - cache TTL
 * @param {Function} keyFn  - optional: (req) => full cache key override
 */
export function cacheMiddleware(keyPrefix, ttlSeconds, keyFn) {
  return async (req, res, next) => {
    // Skip non-GET
    if (req.method !== "GET") return next();

    const cacheKey = keyFn
      ? keyFn(req)
      : `${keyPrefix}:${req.user?.userId || "anon"}:${JSON.stringify(req.query)}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        res.set("X-Cache", "HIT");
        return res.send({ success: true, ...parsed, statusCode: 200 });
      } catch {
        // Corrupt cache — treat as miss
      }
    }

    // Capture the original json send
    const originalJson = res.json.bind(res);
    let payload = null;

    res.json = (body) => {
      payload = body;
      // Don't cache error responses
      if (body?.success !== false && body?.statusCode !== 500) {
        redis.set(cacheKey, JSON.stringify(body), ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache entries matching a key pattern.
 * Call after mutations (create/update/delete).
 */
export async function invalidateCache(pattern) {
  if (!redis.ready) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await Promise.all(keys.map((k) => redis.del(k)));
      logger.debug(`[Cache] Invalidated ${keys.length} keys: ${pattern}`);
    }
  } catch (err) {
    logger.error("[Cache] Invalidation error", { error: err.message, pattern });
  }
}

/**
 * Request tracing middleware.
 * Attaches a unique requestId to every request for tracing.
 */
export const requestTracer = (req, res, next) => {
  req.requestId = req.headers["x-request-id"] || uuidv4();
  res.set("X-Request-Id", req.requestId);
  next();
};

/**
 * Per-user rate limit check.
 * Returns 429 if limit exceeded.
 */
export async function perUserRateLimit(req, res, next) {
  const userId = req.user?.userId || req.ip;
  const endpoint = req.route?.path || req.path;

  const { allowed, remaining, current } = await redis.userRateLimit(userId, endpoint, 60, 100);

  res.set({
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Current": String(current),
  });

  if (!allowed) {
    logger.warn(`[RateLimit] Exceeded: ${userId} on ${endpoint}`);
    // Track rate limit events for metrics
    await redis.incr("metrics:ratelimit_rejected").catch(() => {});
    return res.status(429).send({
      success: false,
      message: "Rate limit exceeded. Please slow down.",
      statusCode: 429,
    });
  }
  // Track request count by method + path for metrics
  const metricKey = `metrics:${req.method}:${endpoint}`;
  await redis.incr(metricKey).catch(() => {});
  await redis.expire(metricKey, 120).catch(() => {});
  next();
}