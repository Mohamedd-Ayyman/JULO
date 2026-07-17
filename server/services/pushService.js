import { config } from "../config/env.js";
import logger from "../utils/logger.js";

let admin = null;
let firebaseInitialized = false;

async function initFirebase() {
  if (firebaseInitialized) return;

  const { FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL } = config.firebase;

  if (!FCM_PROJECT_ID || !FCM_PRIVATE_KEY || !FCM_CLIENT_EMAIL) {
    logger.warn("[Push] Firebase credentials not configured — push notifications disabled");
    firebaseInitialized = true;
    return;
  }

  try {
    const firebaseAdmin = await import("firebase-admin");
    const firebaseApp = firebaseAdmin.default.initializeApp({
      credential: firebaseAdmin.default.credential.cert({
        projectId: FCM_PROJECT_ID,
        privateKey: FCM_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: FCM_CLIENT_EMAIL,
      }),
    });

    admin = firebaseApp;
    firebaseInitialized = true;
    logger.info("[Push] Firebase Admin initialized successfully");
  } catch (err) {
    logger.error("[Push] Failed to initialize Firebase Admin", { error: err.message });
    firebaseInitialized = true;
  }
}

class PushService {
  constructor() {
    this.ready = initFirebase();
  }

  async send(notification) {
    await this.ready;
    if (!admin) return null;

    try {
      const { messaging } = admin;
      const result = await messaging().sendEachForMulticast(notification);
      return {
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses.map((r) => ({
          success: r.success,
          error: r.error?.message || null,
        })),
      };
    } catch (err) {
      logger.error("[Push] Failed to send push notification", { error: err.message });
      return null;
    }
  }

  async sendToToken(token, payload) {
    await this.ready;
    if (!admin) return null;

    try {
      const { messaging } = admin;
      const result = await messaging().send({
        token,
        notification: payload.notification,
        data: payload.data || {},
        webpush: payload.webpush,
        android: payload.android,
        apns: payload.apns,
      });
      return { success: true, messageId: result };
    } catch (err) {
      if (err.code === "messaging/registration-token-not-registered" || err.code === "messaging/invalid-registration-token") {
        logger.warn("[Push] Invalid token detected", { error: err.message });
        return { success: false, invalidToken: true };
      }
      logger.error("[Push] Failed to send to token", { error: err.message });
      return { success: false };
    }
  }

  isAvailable() {
    return !!admin;
  }
}

export default new PushService();
