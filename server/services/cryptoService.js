import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

export class CryptoService {
  generateSalt() {
    return crypto.randomBytes(SALT_LENGTH);
  }

  generateIV() {
    return crypto.randomBytes(IV_LENGTH);
  }

  generateRandomBytes(length) {
    return crypto.randomBytes(length);
  }

  generateIdentityKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });

    return {
      publicKey: publicKey.toString("base64"),
      privateKey: privateKey.toString("base64"),
    };
  }

  generateEphemeralKeyPair() {
    return this.generateIdentityKeyPair();
  }

  generateSignedPreKey(identityPrivateKey) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });

    const signature = this.signMessage(publicKey, identityPrivateKey);

    return {
      publicKey: publicKey.toString("base64"),
      privateKey: privateKey.toString("base64"),
      signature,
    };
  }

  generateOneTimePreKey() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });

    return {
      publicKey: publicKey.toString("base64"),
      privateKey: privateKey.toString("base64"),
    };
  }

  signMessage(message, privateKeyBase64) {
    const privateKeyBuffer = Buffer.from(privateKeyBase64, "base64");
    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: "der",
      type: "pkcs8",
    });

    const sign = crypto.createSign("SHA256");
    sign.update(typeof message === "string" ? message : message.toString("base64"));
    sign.end();

    return sign.sign(privateKey).toString("base64");
  }

  verifySignature(message, signatureBase64, publicKeyBase64) {
    try {
      const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
      const publicKey = crypto.createPublicKey({
        key: publicKeyBuffer,
        format: "der",
        type: "spki",
      });

      const verify = crypto.createVerify("SHA256");
      verify.update(typeof message === "string" ? message : message.toString("base64"));
      verify.end();

      return verify.verify(publicKey, Buffer.from(signatureBase64, "base64"));
    } catch {
      return false;
    }
  }

  performDH(privateKeyBase64, publicKeyBase64) {
    const privateKeyBuffer = Buffer.from(privateKeyBase64, "base64");
    const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");

    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: "der",
      type: "pkcs8",
    });

    const publicKey = crypto.createPublicKey({
      key: publicKeyBuffer,
      format: "der",
      type: "spki",
    });

    const secret = crypto.diffieHellman({ privateKey, publicKey });
    return secret.toString("base64");
  }

  deriveKey(sharedSecret, salt, info, length = KEY_LENGTH) {
    const sharedSecretBuffer = Buffer.from(sharedSecret, "base64");
    const saltBuffer = typeof salt === "string" ? Buffer.from(salt, "base64") : salt;
    const infoBuffer = typeof info === "string" ? Buffer.from(info, "utf8") : info;

    const prk = crypto.createHmac("sha256", saltBuffer).update(sharedSecretBuffer).digest();
    const derivedKey = crypto.createHmac("sha256", prk)
      .update(Buffer.concat([infoBuffer, Buffer.from([1])]))
      .update(Buffer.alloc(1, 1))
      .digest();

    return derivedKey.slice(0, length).toString("base64");
  }

  async performX3DH(ephemeralPrivateKey, identityPublicKey, signedPrePublicKey, oneTimePrePublicKey) {
    const dh1 = this.performDH(ephemeralPrivateKey, signedPrePublicKey);
    const dh2 = this.performDH(ephemeralPrivateKey, identityPublicKey);

    let sharedSecret = Buffer.from(dh1, "base64");
    const dh2Buffer = Buffer.from(dh2, "base64");

    for (let i = 0; i < sharedSecret.length; i++) {
      sharedSecret[i] ^= dh2Buffer[i % dh2Buffer.length];
    }

    if (oneTimePrePublicKey) {
      const dh3 = this.performDH(ephemeralPrivateKey, oneTimePrePublicKey);
      const dh3Buffer = Buffer.from(dh3, "base64");
      for (let i = 0; i < sharedSecret.length; i++) {
        sharedSecret[i] ^= dh3Buffer[i % dh3Buffer.length];
      }
    }

    return sharedSecret.toString("base64");
  }

  encrypt(plaintext, keyBase64, associatedData = null) {
    const key = Buffer.from(keyBase64, "base64");
    const iv = this.generateIV();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    if (associatedData) {
      const aad = typeof associatedData === "string" ? Buffer.from(associatedData) : associatedData;
      cipher.setAAD(aad);
    }

    const encrypted = Buffer.concat([
      cipher.update(typeof plaintext === "string" ? Buffer.from(plaintext) : plaintext),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
    };
  }

  decrypt(ciphertextBase64, keyBase64, ivBase64, authTagBase64, associatedData = null) {
    const ciphertext = Buffer.from(ciphertextBase64, "base64");
    const key = Buffer.from(keyBase64, "base64");
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    if (associatedData) {
      const aad = typeof associatedData === "string" ? Buffer.from(associatedData) : associatedData;
      decipher.setAAD(aad);
    }

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }

  initRatchet(sharedSecret) {
    const salt = this.generateSalt();
    const rootKey = this.deriveKey(sharedSecret, salt, "ratchet-root-key");
    const chainKey = this.deriveKey(rootKey, salt, "ratchet-chain-key");

    return {
      rootKey,
      chainKey,
      sendingKey: null,
      receivingKey: null,
      messageNumber: 0,
      previousChainLength: 0,
    };
  }

  ratchetEncrypt(ratchetState, plaintext) {
    const messageKey = this.deriveKey(ratchetState.chainKey, this.generateSalt(), `msg-${ratchetState.messageNumber}`);
    const result = this.encrypt(plaintext, messageKey);

    const newChainKey = this.deriveKey(ratchetState.chainKey, this.generateSalt(), "chain-advance");

    return {
      ...result,
      messageKey,
      ratchetStep: ratchetState.messageNumber,
      newChainKey,
    };
  }

  ratchetDecrypt(ratchetState, ciphertextBase64, keyBase64, ivBase64, authTagBase64) {
    const plaintext = this.decrypt(ciphertextBase64, keyBase64, ivBase64, authTagBase64);

    const newChainKey = this.deriveKey(ratchetState.chainKey, this.generateSalt(), "chain-advance");

    return {
      plaintext,
      newChainKey,
      messageNumber: ratchetState.messageNumber + 1,
    };
  }

  serializeRatchetState(state) {
    return Buffer.from(JSON.stringify(state)).toString("base64");
  }

  deserializeRatchetState(serialized) {
    return JSON.parse(Buffer.from(serialized, "base64").toString("utf8"));
  }
}

export default new CryptoService();
