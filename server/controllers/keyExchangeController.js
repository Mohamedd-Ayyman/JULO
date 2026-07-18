import express from "express";
import keyManagementService from "../services/keyManagementService.js";
import cryptoService from "../services/cryptoService.js";
import AuditLog from "../models/auditLog.js";
import User from "../models/user.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/AppError.js";
import { validate, identityKeyUploadSchema, signedPreKeyUploadSchema, oneTimePreKeysUploadSchema } from "../utils/validate.js";

const router = express.Router();

// ── Upload identity public key ──────────────────────────────────────
router.post(
  "/identity",
  requireAuth,
  validate(identityKeyUploadSchema),
  asyncHandler(async (req, res) => {
    const { publicKey, signature } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || null;

    const identityKey = await keyManagementService.uploadIdentityKey(userId, publicKey, signature, tenantId);

    await User.findByIdAndUpdate(userId, { hasIdentityKey: true });

    await AuditLog.create({
      userId,
      action: "create",
      resource: "identity_key",
      resourceId: userId.toString(),
      metadata: { keyVersion: identityKey.keyVersion },
      tenantId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: { userId, keyVersion: identityKey.keyVersion, createdAt: identityKey.createdAt },
      statusCode: 201,
    });
  })
);

// ── Get identity public key ─────────────────────────────────────────
router.get(
  "/identity/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const identityKey = await keyManagementService.getIdentityKey(userId);
    if (!identityKey) {
      return res.status(404).json({ success: false, message: "Identity key not found", statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      data: {
        userId: identityKey.userId,
        publicKey: identityKey.publicKey,
        signature: identityKey.signature,
        keyVersion: identityKey.keyVersion,
      },
      statusCode: 200,
    });
  })
);

// ── Upload signed pre-key ───────────────────────────────────────────
router.post(
  "/signed-prekey",
  requireAuth,
  validate(signedPreKeyUploadSchema),
  asyncHandler(async (req, res) => {
    const { keyId, publicKey, privateKey, signature } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || null;

    const signedPreKey = await keyManagementService.uploadSignedPreKey(
      userId, keyId, publicKey, privateKey, signature, tenantId
    );

    await AuditLog.create({
      userId,
      action: "create",
      resource: "signed_pre_key",
      resourceId: signedPreKey._id.toString(),
      metadata: { keyId },
      tenantId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: { keyId: signedPreKey.keyId, createdAt: signedPreKey.createdAt },
      statusCode: 201,
    });
  })
);

// ── Get signed pre-key ──────────────────────────────────────────────
router.get(
  "/signed-prekey/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const signedPreKey = await keyManagementService.getSignedPreKey(userId);
    if (!signedPreKey) {
      return res.status(404).json({ success: false, message: "Signed pre-key not found", statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      data: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.publicKey,
        signature: signedPreKey.signature,
      },
      statusCode: 200,
    });
  })
);

// ── Upload one-time pre-keys (batch) ────────────────────────────────
router.post(
  "/one-time-prekeys",
  requireAuth,
  validate(oneTimePreKeysUploadSchema),
  asyncHandler(async (req, res) => {
    const { preKeys } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || null;

    const createdKeys = await keyManagementService.uploadOneTimePreKeys(userId, preKeys, tenantId);

    await AuditLog.create({
      userId,
      action: "create",
      resource: "pre_key",
      resourceId: userId.toString(),
      metadata: { count: createdKeys.length },
      tenantId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: { count: createdKeys.length },
      statusCode: 201,
    });
  })
);

// ── Get full pre-key bundle for X3DH ────────────────────────────────
router.get(
  "/bundle/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const includeOneTimeKey = req.query.includeOneTimeKey !== "false";

    const bundle = await keyManagementService.getKeyBundle(userId, includeOneTimeKey);

    res.status(200).json({
      success: true,
      data: bundle,
      statusCode: 200,
    });
  })
);

// ── Rotate signed pre-key ───────────────────────────────────────────
router.post(
  "/rotate-signed-prekey",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const newKey = await keyManagementService.rotateSignedPreKey(userId, cryptoService);

    await User.findByIdAndUpdate(userId, { lastKeyRotation: new Date() });

    await AuditLog.create({
      userId,
      action: "update",
      resource: "signed_pre_key",
      resourceId: newKey._id.toString(),
      metadata: { newKeyId: newKey.keyId },
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { keyId: newKey.keyId, createdAt: newKey.createdAt },
      statusCode: 200,
    });
  })
);

// ── Get one-time pre-key count ──────────────────────────────────────
router.get(
  "/one-time-count",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const count = await keyManagementService.getOneTimeKeyCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
      statusCode: 200,
    });
  })
);

// ── Delete all encryption keys ──────────────────────────────────────
router.delete(
  "/all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    await keyManagementService.deleteAllKeys(userId);

    await User.findByIdAndUpdate(userId, { hasIdentityKey: false });

    await AuditLog.create({
      userId,
      action: "delete",
      resource: "identity_key",
      resourceId: userId.toString(),
      metadata: { deletedAt: new Date() },
      tenantId: req.user.tenantId || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      data: { deleted: true },
      statusCode: 200,
    });
  })
);

export default router;
