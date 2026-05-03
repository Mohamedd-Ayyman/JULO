import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import Session from "../models/session.js";

const REFRESH_TOKEN_TTL_DAYS = 30;
const ACCESS_TOKEN_TTL = "15m";
const MAX_FAMILY_SIZE = 5;  // max rotations before requiring re-login

export class AuthService {
  /**
   * Register a new user.
   * Assigns them to a tenant if tenantId is provided, otherwise creates a personal workspace.
   */
  async register({ firstname, lastname, email, password, tenantId = null, role = "user" }) {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error("An account with this email already exists");
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      firstname, lastname, email,
      password: hashedPassword,
      tenantId,
      role: role || "user",
      passwordChangedAt: new Date(),
    });
    await user.save();
    logger.info(`[Auth] Registered: ${email} | tenant=${tenantId || "personal"} | role=${role}`);

    return { userId: user._id, tenantId: user.tenantId };
  }

  /**
   * Login with email + password.
   * Issues an access token (JWT) and a refresh token (opaque, stored as hash in Session model).
   * The refresh token is returned as an httpOnly cookie AND in the response body.
   */
  async login({ email, password, req }) {
    const user = await User.findOne({ email });
    if (!user) {
      await this._recordFailedLogin(null, email);
      const err = new Error("No account found with this email");
      err.statusCode = 401;
      throw err;
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const err = new Error(`Account is locked. Try again after ${user.lockedUntil.toLocaleTimeString()}`);
      err.statusCode = 423;
      throw err;
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      await this._recordFailedLogin(user, email);
      const err = new Error("Incorrect password");
      err.statusCode = 401;
      throw err;
    }

    // Clear failed attempts on successful login
    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null, isOnline: true, lastLogin: new Date() });
    await this._recordLoginHistory(user._id, req);

    const accessToken = this._signAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString("base64url");
    const tokenHash = Session.hashToken(refreshToken);
    const tokenFamily = crypto.randomUUID();

    // Store session (refresh token hash)
    const session = await Session.create({
      userId: user._id,
      tenantId: user.tenantId,
      tokenHash,
      tokenFamily,
      userAgent: req?.headers?.["user-agent"] || null,
      ip: this._extractIp(req),
      deviceType: this._detectDeviceType(req?.headers?.["user-agent"]),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    logger.info(`[Auth] Login: ${email} | session=${session._id} | device=${session.deviceType}`, {
      userId: user._id, tenantId: user.tenantId,
    });

    const userObject = user.toObject({ virtuals: true });
    delete userObject.password;

    return {
      token: accessToken,
      user: userObject,
      refreshToken,           // body response (client stores in memory)
      sessionId: session._id,
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      expiresIn: 15 * 60,
    };
  }

  /**
   * Refresh tokens — implements rotation with family tracking.
   *
   * Flow:
   * 1. Hash the incoming refresh token and find the session.
   * 2. Verify session is not revoked (by family).
   * 3. Revoke the current session (marks family as rotated).
   * 4. Issue a new session with the same family (rotation count incremented).
   * 5. If rotation count exceeds MAX_FAMILY_SIZE, invalidate all — re-login required.
   */
  async refreshTokens({ refreshToken, req }) {
    if (!refreshToken) {
      const err = new Error("Refresh token required");
      err.statusCode = 400;
      throw err;
    }

    const tokenHash = Session.hashToken(refreshToken);
    const session = await Session.findOne({ tokenHash, revokedAt: null });

    if (!session) {
      logger.warn("[Auth] Refresh with unknown/revoked token", { ip: this._extractIp(req) });
      const err = new Error("Invalid or expired refresh token");
      err.statusCode = 401;
      throw err;
    }

    if (session.expiresAt < new Date()) {
      const err = new Error("Refresh token expired");
      err.statusCode = 401;
      throw err;
    }

    // Enforce rotation limit
    if (session.rotationCount >= MAX_FAMILY_SIZE) {
      await Session.revokeAllForUser(session.userId, "rotation_limit");
      logger.warn("[Auth] Token family exceeded rotation limit — all sessions revoked", {
        userId: session.userId, family: session.tokenFamily,
      });
      const err = new Error("Session expired for security. Please log in again.");
      err.statusCode = 401;
      throw err;
    }

    // Get user for updated role/tenant
    const user = await User.findById(session.userId).select("-password");
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    // ── Rotation: revoke current, issue new ────────────────────────────────
    await Session.findByIdAndUpdate(session._id, {
      revokedAt: new Date(),
      revokedReason: "refresh",
    });

    const newRefreshToken = crypto.randomBytes(48).toString("base64url");
    const newHash = Session.hashToken(newRefreshToken);

    const newSession = await Session.create({
      userId: session.userId,
      tenantId: session.tenantId,
      tokenHash: newHash,
      tokenFamily: session.tokenFamily,
      userAgent: req?.headers?.["user-agent"] || null,
      ip: this._extractIp(req),
      deviceType: this._detectDeviceType(req?.headers?.["user-agent"]),
      rotationCount: session.rotationCount + 1,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    const accessToken = this._signAccessToken(user);

    // Create user object without password
    const { password, ...userObject } = user.toObject();

    logger.info(`[Auth] Token rotated: user=${user.email} family=${session.tokenFamily} count=${newSession.rotationCount}`);

    return {
      token: accessToken,
      user: userObject,
      refreshToken: newRefreshToken,
      sessionId: newSession._id,
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      expiresIn: 15 * 60,
    };
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const validPass = await bcrypt.compare(currentPassword, user.password);
    if (!validPass) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 401;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await Session.revokeAllForUser(user._id, "password_change");
    logger.info(`[Auth] Password changed for user ${user._id}`);
    return { success: true };
  }

  /**
   * Logout: revoke the refresh token (session).
   * Optionally revoke all sessions for the user ("logout everywhere").
   */
  async logout({ userId, refreshToken, allDevices = false }) {
    if (allDevices) {
      const revoked = await Session.revokeAllForUser(userId, "logout_all");
      logger.info(`[Auth] Logged out all devices: userId=${userId}`, { count: revoked.modifiedCount });
      return { revokedCount: revoked.modifiedCount };
    }

    if (refreshToken) {
      const tokenHash = Session.hashToken(refreshToken);
      const session = await Session.findOneAndUpdate(
        { userId, tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedReason: "logout" } },
        { new: true }
      );
      logger.info(`[Auth] Logged out session: userId=${userId} session=${session?._id}`);
      return { revokedCount: session ? 1 : 0 };
    }

    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    return { revokedCount: 0 };
  }

  /**
   * Get all active sessions for a user (for "manage devices" UI).
   */
  async getActiveSessions(userId) {
    const sessions = await Session.find({ userId, revokedAt: null })
      .sort({ createdAt: -1 })
      .select("-tokenHash")
      .lean();
    return sessions;
  }

  /**
   * Revoke a specific session by ID (e.g., from "sign out this device" in UI).
   */
  async revokeSession(userId, sessionId) {
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: "user_revoke" } }
    );
    if (!session) {
      const err = new Error("Session not found");
      err.statusCode = 404;
      throw err;
    }
    logger.info(`[Auth] Revoked session ${sessionId} for user ${userId}`);
  }

  /**
   * Revoke all sessions except the current one (logout other devices).
   */
  async revokeOtherSessions(userId, excludeFamily) {
    const result = await Session.revokeOthersForUser(userId, excludeFamily, "logout_others");
    logger.info(`[Auth] Revoked other sessions: userId=${userId}`, { count: result.modifiedCount });
    return { revokedCount: result.modifiedCount };
  }

  // ── Token signing ─────────────────────────────────────────────────────────────
  _signAccessToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      },
      config.secretKey,
      { expiresIn: ACCESS_TOKEN_TTL, algorithm: "HS256" }
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  _extractIp(req) {
    return req?.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req?.headers["x-real-ip"]
      || req?.socket?.remoteAddress
      || null;
  }

  _detectDeviceType(userAgent) {
    if (!userAgent) return "other";
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/bot|crawler|spider/i.test(ua)) return "bot";
    return "desktop";
  }

  async _recordFailedLogin(user, email) {
    if (!user) return;
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updates = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);  // 30 min lockout
      logger.warn(`[Auth] Account locked: ${email} (${attempts} failed attempts)`);
    }
    await User.findByIdAndUpdate(user._id, updates);
  }

  async _recordLoginHistory(userId, req) {
    if (!req) return;
    const entry = {
      ip: this._extractIp(req),
      userAgent: req.headers?.["user-agent"] || null,
      timestamp: new Date(),
    };
    await User.findByIdAndUpdate(userId, { $push: { loginHistory: { $each: [entry], $slice: -10 } } });
  }
}

export default new AuthService();
