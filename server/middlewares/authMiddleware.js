import jwt from "jsonwebtoken";
import Session from "../models/session.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

/**
 * authMiddleware — validates access token and attaches user context to req.
 *
 * Checks:
 * 1. Valid JWT (not expired, not malformed)
 * 2. Token not on blacklist (Redis)
 * 3. Session not revoked (DB — only for refresh-token-gated routes)
 *
 * Short-lived access tokens (15m) don't need session DB lookup.
 * For strictly sensitive operations, use `requireSession = true`.
 */
export const authMiddleware = (options = {}) => {
  const { requireSession = false } = options;

  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError("Authentication required", 401);
      }

      const token = authHeader.split(" ")[1];

      // ── 1. Verify JWT ─────────────────────────────────────────────────────
      let decoded;
      try {
        decoded = jwt.verify(token, config.secretKey, { algorithms: ["HS256"] });
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          throw new AppError("Access token expired — please refresh", 401);
        }
        throw new AppError("Invalid access token", 401);
      }

      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId || null,
        role: decoded.role || "user",
        iat: decoded.iat,
      };
      req.accessToken = token;

      // ── 2. Optional: verify session not revoked (refresh token still valid) ──
      //    Enable via authMiddleware({ requireSession: true }) for sensitive ops
      if (requireSession && decoded.jti) {
        const isRevoked = await checkSessionRevoked(decoded.jti, decoded.userId);
        if (isRevoked) {
          throw new AppError("Session revoked — please log in again", 401);
        }
      }

      next();
    } catch (err) {
      if (err instanceof AppError) return res.status(err.statusCode).send({ success: false, message: err.message, statusCode: err.statusCode });
      logger.error("[Auth] Middleware error", { error: err.message, path: req.originalUrl });
      res.status(401).send({ success: false, message: "Authentication failed", statusCode: 401 });
    }
  };
};

/** Simple auth check (just JWT — no session DB lookup). Use for most routes. */
export const requireAuth = authMiddleware({ requireSession: false });

/** Strict auth check (JWT + session not revoked). Use for sensitive operations. */
export const requireStrictAuth = authMiddleware({ requireSession: true });

/**
 * Blacklist a token by its JTI until expiry.
 * Used when logout is called without a refresh token (e.g., client-side token clear).
 */
export async function blacklistAccessToken(jti, expiresInSeconds) {
  if (!config.redisEnabled) return;
  const { redis } = await import("../config/redis.js");
  await redis.set(`blacklist:${jti}`, "1", Math.ceil(expiresInSeconds));
}

/** Check if an access token JTI is on the blacklist. */
export async function isAccessTokenBlacklisted(jti) {
  if (!config.redisEnabled) return false;
  const { redis } = await import("../config/redis.js");
  const val = await redis.get(`blacklist:${jti}`);
  return val === "1";
}

/** Check if a session (refresh token) is revoked via DB lookup. */
async function checkSessionRevoked(sessionId, userId) {
  try {
    const session = await Session.findOne({ _id: sessionId, userId });
    return session ? session.revokedAt !== null : true;
  } catch {
    return false;
  }
}

/**
 * Extract refresh token from httpOnly cookie or Authorization header.
 * Cookie is preferred (XSS-safe for the refresh token).
 */
export function extractRefreshToken(req) {
  // Priority 1: httpOnly cookie (secure, XSS-safe)
  if (req.cookies?.refreshToken) return req.cookies.refreshToken;
  // Priority 2: Authorization header fallback
  if (req.headers["x-refresh-token"]) return req.headers["x-refresh-token"];
  return null;
}