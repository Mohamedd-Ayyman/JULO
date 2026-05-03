import express from "express";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import authService from "../services/authService.js";
import { asyncHandler, AppError } from "../utils/AppError.js";
import { config } from "../config/env.js";

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════
// LEGACY AUTH — kept for backward compatibility
// ═══════════════════════════════════════════════════════════════════════

const validateSignup = [
  body("firstname").trim().notEmpty().withMessage("First name is required"),
  body("lastname").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),
];

/**
 * POST /api/auth/signup
 * Legacy signup — creates user with 7-day JWT (no refresh token).
 */
router.post("/signup", validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ message: errors.array()[0].msg, success: false });
    }
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.send({ message: "User already exists", success: false });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({ ...req.body, password: hashedPassword });
    await newUser.save();

    const authToken = jwt.sign({ userId: newUser._id }, process.env.SECRET_KEY, { expiresIn: "7d" });
    const safeUser = newUser.toObject();
    delete safeUser.password;

    return res.status(201).send({ message: "User created successfully", success: true, token: authToken, user: safeUser });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
});

/**
 * POST /api/auth/login
 * Legacy login — returns 7-day JWT (no refresh token).
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({ message: "Email and password are required", success: false });
    }

    const user = await User.findOne({ email });
    if (!user) return res.send({ message: "No account found with this email", success: false });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.send({ message: "Incorrect Password", success: false });

    user.isOnline = true;
    await user.save();

    const authToken = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: "7d" });
    const safeUser = user.toObject();
    delete safeUser.password;

    res.send({ message: "login Successful", success: true, token: authToken, user: safeUser });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
});

/**
 * POST /api/auth/logout
 * Legacy logout — clears online status.
 */
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      await User.findByIdAndUpdate(decoded.userId, { isOnline: false, lastSeen: new Date() });
    }
    res.send({ message: "Logged out", success: true });
  } catch {
    res.send({ message: "Logout successful", success: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// NEW AUTH — JWT access + refresh token sessions
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/change-password
 * Requires current password. Revokes all other sessions on success.
 */
router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) throw new AppError("Current password is required", 400);
    if (!newPassword) throw new AppError("New password is required", 400);
    if (newPassword.length < 8) throw new AppError("Password must be at least 8 characters", 400);

    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    await authService.changePassword({ userId: decoded.userId, currentPassword, newPassword });
    res.send({ success: true, message: "Password updated — please log in again on other devices", statusCode: 200 });
  })
);

/**
 * GET /api/auth/sessions
 * Returns all active sessions for the current user.
 */
router.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const sessions = await authService.getActiveSessions(decoded.userId);
    const currentSessionId = req.headers["x-session-id"];
    const sessionsWithCurrent = (sessions || []).map((s) => ({
      ...s,
      isCurrent: s._id?.toString() === currentSessionId,
    }));
    res.send({ success: true, data: sessionsWithCurrent, statusCode: 200 });
  })
);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revokes a specific session.
 */
router.delete(
  "/sessions/:sessionId",
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    await authService.revokeSession(decoded.userId, req.params.sessionId);
    res.send({ success: true, message: "Session ended", statusCode: 200 });
  })
);

/**
 * POST /api/auth/sessions/revoke-others
 * Revokes all sessions except the current one.
 */
router.post(
  "/sessions/revoke-others",
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new AppError("Unauthorized", 401);

    let decoded;
    try {
      decoded = jwt.verify(token, config.secretKey);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const currentFamily = req.headers["x-token-family"];
    const result = await authService.revokeOtherSessions(decoded.userId, currentFamily);
    res.send({ success: true, revokedCount: result.revokedCount, statusCode: 200 });
  })
);

/**
 * POST /api/auth/refresh
 * Refreshes access token using a valid refresh token.
 */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError("Refresh token required", 400);
    const result = await authService.refreshTokens({ refreshToken, req });
    res.send({ success: true, ...result, statusCode: 200 });
  })
);

export default router;