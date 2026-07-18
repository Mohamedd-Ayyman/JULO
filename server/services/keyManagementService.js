import IdentityKey from "../models/identityKey.js";
import SignedPreKey from "../models/signedPreKey.js";
import OneTimePreKey from "../models/oneTimePreKey.js";
import AuditLog from "../models/auditLog.js";
import logger from "../utils/logger.js";

class KeyManagementService {
  async uploadIdentityKey(userId, publicKey, signature, tenantId = null) {
    try {
      const existing = await IdentityKey.findOne({ userId });

      if (existing) {
        existing.publicKey = publicKey;
        existing.signature = signature;
        existing.keyVersion = existing.keyVersion + 1;
        await existing.save();

        logger.info(`Identity key updated for user ${userId}, version ${existing.keyVersion}`);
        return existing;
      }

      const identityKey = await IdentityKey.create({
        userId,
        publicKey,
        signature,
        keyVersion: 1,
        tenantId,
      });

      logger.info(`Identity key created for user ${userId}`);
      return identityKey;
    } catch (error) {
      logger.error("Error uploading identity key:", error);
      throw error;
    }
  }

  async getIdentityKey(userId) {
    return IdentityKey.findOne({ userId });
  }

  async uploadSignedPreKey(userId, keyId, publicKey, privateKey, signature, tenantId = null) {
    try {
      const existing = await SignedPreKey.findOne({ userId, keyId });

      if (existing) {
        existing.publicKey = publicKey;
        existing.privateKey = privateKey;
        existing.signature = signature;
        existing.isActive = true;
        existing.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await existing.save();

        logger.info(`Signed pre-key ${keyId} updated for user ${userId}`);
        return existing;
      }

      await SignedPreKey.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );

      const signedPreKey = await SignedPreKey.create({
        userId,
        keyId,
        publicKey,
        privateKey,
        signature,
        isActive: true,
        tenantId,
      });

      logger.info(`Signed pre-key ${keyId} created for user ${userId}`);
      return signedPreKey;
    } catch (error) {
      logger.error("Error uploading signed pre-key:", error);
      throw error;
    }
  }

  async getSignedPreKey(userId) {
    return SignedPreKey.findOne({ userId, isActive: true });
  }

  async uploadOneTimePreKeys(userId, preKeys, tenantId = null) {
    try {
      const createdKeys = await Promise.all(
        preKeys.map(async (preKey) => {
          const existing = await OneTimePreKey.findOne({
            userId,
            keyId: preKey.keyId,
          });

          if (existing) {
            return existing;
          }

          return OneTimePreKey.create({
            userId,
            keyId: preKey.keyId,
            publicKey: preKey.publicKey,
            privateKey: preKey.privateKey,
            tenantId,
          });
        })
      );

      logger.info(`${createdKeys.length} one-time pre-keys uploaded for user ${userId}`);
      return createdKeys;
    } catch (error) {
      logger.error("Error uploading one-time pre-keys:", error);
      throw error;
    }
  }

  async consumeOneTimePreKey(userId) {
    try {
      const preKey = await OneTimePreKey.findOneAndUpdate(
        { userId, isUsed: false },
        { isUsed: true, usedAt: new Date() },
        { new: true, sort: { keyId: 1 } }
      );

      if (!preKey) {
        logger.warn(`No one-time pre-keys available for user ${userId}`);
        return null;
      }

      logger.info(`One-time pre-key ${preKey.keyId} consumed for user ${userId}`);
      return preKey;
    } catch (error) {
      logger.error("Error consuming one-time pre-key:", error);
      throw error;
    }
  }

  async getKeyBundle(userId, includeOneTimeKey = true) {
    try {
      const identityKey = await this.getIdentityKey(userId);
      if (!identityKey) {
        throw new Error("Identity key not found");
      }

      const signedPreKey = await this.getSignedPreKey(userId);
      if (!signedPreKey) {
        throw new Error("Signed pre-key not found");
      }

      const bundle = {
        userId,
        identityKey: {
          publicKey: identityKey.publicKey,
          signature: identityKey.signature,
          keyVersion: identityKey.keyVersion,
        },
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.publicKey,
          signature: signedPreKey.signature,
        },
      };

      if (includeOneTimeKey) {
        const oneTimeKey = await this.consumeOneTimePreKey(userId);
        if (oneTimeKey) {
          bundle.oneTimePreKey = {
            keyId: oneTimeKey.keyId,
            publicKey: oneTimeKey.publicKey,
          };
        }
      }

      return bundle;
    } catch (error) {
      logger.error("Error getting key bundle:", error);
      throw error;
    }
  }

  async rotateSignedPreKey(userId, cryptoService) {
    try {
      const identityKey = await this.getIdentityKey(userId);
      if (!identityKey) {
        throw new Error("Identity key not found");
      }

      await SignedPreKey.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );

      const newSignedPreKey = cryptoService.generateSignedPreKey(identityKey.privateKey);

      const nextKeyId = await SignedPreKey.countDocuments({ userId }) + 1;

      const savedKey = await this.uploadSignedPreKey(
        userId,
        nextKeyId,
        newSignedPreKey.publicKey,
        newSignedPreKey.privateKey,
        newSignedPreKey.signature
      );

      logger.info(`Signed pre-key rotated for user ${userId}, new key ID: ${nextKeyId}`);
      return savedKey;
    } catch (error) {
      logger.error("Error rotating signed pre-key:", error);
      throw error;
    }
  }

  async deleteAllKeys(userId) {
    try {
      await IdentityKey.deleteOne({ userId });
      await SignedPreKey.deleteMany({ userId });
      await OneTimePreKey.deleteMany({ userId });

      logger.info(`All encryption keys deleted for user ${userId}`);
    } catch (error) {
      logger.error("Error deleting all keys:", error);
      throw error;
    }
  }

  async getKeysNeedingRotation() {
    try {
      const threshold = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      return SignedPreKey.find({
        isActive: true,
        expiresAt: { $lte: threshold },
      }).select("userId keyId expiresAt");
    } catch (error) {
      logger.error("Error getting keys needing rotation:", error);
      throw error;
    }
  }

  async getOneTimeKeyCount(userId) {
    return OneTimePreKey.countDocuments({ userId, isUsed: false });
  }
}

export default new KeyManagementService();
