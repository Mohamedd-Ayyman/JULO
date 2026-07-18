import crypto from "crypto";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import logger from "../utils/logger.js";

const CREDENTIAL_CACHE_PREFIX = "turn:cred:";
const GOOGLE_STUN = "stun:stun.l.google.com:19302";
const GOOGLE_STUN_2 = "stun:stun1.l.google.com:19302";

class TurnService {
  constructor() {
    this.secret = config.turn.secret;
    this.realm = config.turn.realm;
    this.ttl = config.turn.credentialTtl;
    this.enabled = config.turn.enabled;
    this.turnUrls = config.turn.turnUrls;
    this.stunUrls = config.turn.stunUrls;
  }

  /**
   * Generate a time-limited TURN credential using HMAC-SHA1 (RFC 5389).
   * Username format: timestamp:userId
   * Credential: base64(HMAC-SHA1(secret, username))
   */
  generateCredential(userId) {
    const timestamp = Math.floor(Date.now() / 1000) + this.ttl;
    const username = `${timestamp}:${userId}`;

    const hmac = crypto.createHmac("sha1", this.secret);
    hmac.update(username);
    const credential = hmac.digest("base64");

    return { username, credential, expiresAt: new Date(timestamp * 1000) };
  }

  /**
   * Build the ICE servers array for RTCPeerConnection.setConfiguration().
   * When TURN_SECRET is configured, returns STUN + time-limited TURN credentials.
   * When TURN_SECRET is not configured, returns public STUN servers only (dev mode).
   */
  async getIceServers(userId) {
    const iceServers = [];

    // STUN servers
    if (this.stunUrls.length > 0) {
      for (const url of this.stunUrls) {
        iceServers.push({ urls: url });
      }
    } else {
      iceServers.push({ urls: GOOGLE_STUN });
      iceServers.push({ urls: GOOGLE_STUN_2 });
    }

    // TURN servers — only when secret is configured
    if (this.enabled && this.secret && this.turnUrls.length > 0) {
      const cached = await this._getCachedCredential(userId);
      if (cached) {
        for (const turnUrl of this.turnUrls) {
          iceServers.push({
            urls: turnUrl,
            username: cached.username,
            credential: cached.credential,
            credentialType: "password",
          });
        }
        return {
          iceServers,
          expiresAt: new Date(cached.expiresAt),
          cached: true,
        };
      }

      const { username, credential, expiresAt } = this.generateCredential(userId);
      await this._cacheCredential(userId, { username, credential, expiresAt: expiresAt.toISOString() });

      for (const turnUrl of this.turnUrls) {
        iceServers.push({
          urls: turnUrl,
          username,
          credential,
          credentialType: "password",
        });
      }

      return {
        iceServers,
        expiresAt,
        cached: false,
      };
    }

    return {
      iceServers,
      expiresAt: new Date(Date.now() + 300_000),
      cached: false,
      turnConfigured: false,
    };
  }

  /**
   * Validate that a TURN username hasn't expired.
   * Called by coturn via the REST auth endpoint if using external auth.
   */
  validateCredential(username, credential) {
    if (!this.secret) return { valid: false, reason: "TURN not configured" };

    const [timestampStr, userId] = username.split(":");
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp) || !userId) {
      return { valid: false, reason: "Invalid username format" };
    }

    if (Date.now() / 1000 > timestamp) {
      return { valid: false, reason: "Credential expired" };
    }

    const hmac = crypto.createHmac("sha1", this.secret);
    hmac.update(username);
    const expected = hmac.digest("base64");

    if (!crypto.timingSafeEqual(Buffer.from(credential), Buffer.from(expected))) {
      return { valid: false, reason: "Invalid credential" };
    }

    return { valid: true, userId };
  }

  // ── Redis caching helpers ──────────────────────────────────────────────

  async _getCachedCredential(userId) {
    try {
      const raw = await redis.get(`${CREDENTIAL_CACHE_PREFIX}${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        await redis.del(`${CREDENTIAL_CACHE_PREFIX}${userId}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async _cacheCredential(userId, data) {
    try {
      const ttlSeconds = Math.max(1, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      await redis.set(`${CREDENTIAL_CACHE_PREFIX}${userId}`, JSON.stringify(data), ttlSeconds);
    } catch {
      // Redis failure is non-fatal — credentials will just be regenerated
    }
  }
}

export default new TurnService();
