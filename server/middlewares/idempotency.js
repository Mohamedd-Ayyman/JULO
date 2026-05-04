/**
 * Idempotency middleware — prevents duplicate processing of POST/PUT/PATCH requests.
 *
 * Uses X-Idempotency-Key header from the client (or generates one).
 * The key is stored in Redis with a 24h TTL, and the response is cached alongside it.
 * If the same key is used again within 24h, the cached response is returned immediately
 * without re-executing the handler.
 *
 * Usage:
 *   router.post("/post/create", requireAuth, tenantMiddleware, idempotencyKey, asyncHandler(...))
 *
 * Client should:
 *   - Generate a UUID v4 for each unique operation
 *   - Retry with the same key if the first request fails with 5xx
 *   - If the server returns 409 with "Duplicate request", use the cached response
 */

import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";

const IDEMPOTENCY_TTL = 86400; // 24 hours

/**
 * Extract or generate an idempotency key from the request.
 * Falls back to a SHA-256 hash of method + path + body when header is absent.
 */
function getIdempotencyKey(req) {
  const headerKey = req.headers["x-idempotency-key"];
  if (headerKey) return headerKey;

  // Fallback: hash of request identity
  const crypto = require("crypto");
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const raw = `${req.method}:${req.path}:${body}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export const idempotencyMiddleware = (options = {}) => {
  const { ttl = IDEMPOTENCY_TTL } = options;

  return async (req, res, next) => {
    // Only idempotent for mutating methods
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

    // Skip if Redis is unavailable
    if (!redis.ready) return next();

    const key = `idempotency:${getIdempotencyKey(req)}`;
    req.idempotencyKey = key;

    try {
      // Check if this key was already processed
      const cached = await redis.get(key);
      if (cached) {
        try {
          const { statusCode, body } = JSON.parse(cached);
          logger.debug(`[Idempotency] Hit: ${key}`);
          res.set("X-Idempotency-Replayed", "true");
          return res.status(statusCode).send(body);
        } catch {
          // Corrupt cache — remove and process normally
          await redis.del(key);
        }
      }
    } catch (err) {
      logger.warn(`[Idempotency] Redis error: ${err.message}`);
      return next(); // Fail-open: process request normally
    }

    // Capture the response to cache it
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);

    let responseBody = null;
    let responseStatus = null;

    res.json = (body) => {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalJson(body);
    };

    res.send = (body) => {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalSend(body);
    };

    // After response is sent, cache the result
    res.on("finish", async () => {
      // Only cache successful 2xx responses
      if (responseStatus >= 200 && responseStatus < 300 && responseBody) {
        try {
          await redis.set(key, JSON.stringify({ statusCode: responseStatus, body: responseBody }), ttl);
          logger.debug(`[Idempotency] Cached: ${key}`);
        } catch (err) {
          logger.warn(`[Idempotency] Cache write failed: ${err.message}`);
        }
      }
    });

    next();
  };
};

/**
 * Clear an idempotency key manually (for rollback scenarios).
 */
export async function clearIdempotencyKey(key) {
  if (!redis.ready) return;
  await redis.del(`idempotency:${key}`);
}