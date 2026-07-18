import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

const REQUIRED = ["CONN_STRING", "SECRET_KEY", "CLIENT_URL"];
for (const key of REQUIRED) {
  const val = process.env[key];
  if (!val || val === "" || val === `your-${key.toLowerCase()}-here`) {
    console.warn(`[ENV] Warning: Missing ${key}. Ensure it is set in Railway dashboard.`);
  }
}

export const config = {
  // ── Server ──────────────────────────────────────────────────────────────────
  port: Number(process.env.PORT || process.env.PORT_NUMBER) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  connString: process.env.CONN_STRING || "mongodb://localhost:27017/julo",
  secretKey: process.env.SECRET_KEY || "temporary-dev-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  clientUrl: process.env.CLIENT_URL || "https://julo-navy.vercel.app",
  clientUrls: (process.env.CLIENT_URLS || process.env.CLIENT_URL || "https://julo-navy.vercel.app")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),

  // ── Redis ─────────────────────────────────────────────────────────────────
  redisEnabled: process.env.NODE_ENV !== "test" && !!process.env.REDIS_URL,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // ── Cloudinary ─────────────────────────────────────────────────────────────
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    apiKey: process.env.CLOUDINARY_API_KEY || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET || null,
    folder: "julo",
  },

  // ── File uploads ───────────────────────────────────────────────────────────
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxChatFileSize: 50 * 1024 * 1024, // 50MB
    maxChatFiles: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    chatImageMimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    chatAudioMimes: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/aac", "audio/flac"],
    chatFileMimes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ],
    signedUrlTtl: 3600,
  },

  // ── Rate limits ────────────────────────────────────────────────────────────
  rateLimit: {
    authWindow: 15 * 60 * 1000,  // 15 min
    authMax: 20,
    apiWindow: 60 * 1000,        // 1 min
    apiMax: 200,
    perUserWindow: 60,
    perUserMax: 100,
  },

  // ── CORS debug ─────────────────────────────────────────────────────────────
  corsDebug: String(process.env.CORS_DEBUG || "").toLowerCase() === "true",

  // ── Cache TTL (seconds) ───────────────────────────────────────────────────
  cache: {
    userProfile: 60,
    allUsers: 30,
    feed: 10,
    userPosts: 30,
    search: 15,
    notifications: 10,
    storiesFeed: 30,
  },

  // ── Firebase / Push Notifications ─────────────────────────────────────────
  firebase: {
    FCM_PROJECT_ID: process.env.FCM_PROJECT_ID || "",
    FCM_PRIVATE_KEY: process.env.FCM_PRIVATE_KEY || "",
    FCM_CLIENT_EMAIL: process.env.FCM_CLIENT_EMAIL || "",
  },

  // ── Stripe ────────────────────────────────────────────────────────────────
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    starterPriceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || "",
    enterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
  },

  // ── BullMQ worker concurrency ──────────────────────────────────────────────
  workers: {
    notificationConcurrency: 5,
    emailConcurrency: 3,
    storyConcurrency: 3,
  },

  // ── TURN / STUN (WebRTC media) ──────────────────────────────────────────────
  turn: {
    enabled: process.env.TURN_ENABLED !== "false",
    secret: process.env.TURN_SECRET || "",
    realm: process.env.TURN_REALM || "julo.app",
    credentialTtl: Number(process.env.TURN_EXPIRES) || 86400,
    turnUrls: (process.env.TURN_URL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    stunUrls: (process.env.STUN_URL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  // ── Circuit breaker defaults ───────────────────────────────────────────────
  circuitBreaker: {
    stripeFailureThreshold: 3,
    stripeResetTimeout: 60000,   // 1 min
    emailFailureThreshold: 5,
    emailResetTimeout: 30000,   // 30 sec
  },

  // ── Derived ──────────────────────────────────────────────────────────────
  get isProduction() { return this.nodeEnv === "production"; },
  get isDevelopment() { return this.nodeEnv === "development"; },
  get isStaging() { return this.nodeEnv === "staging"; },
  get isTest() { return this.nodeEnv === "test"; },
};
