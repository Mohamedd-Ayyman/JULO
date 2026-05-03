import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

const REQUIRED = ["PORT_NUMBER", "CONN_STRING", "SECRET_KEY", "CLIENT_URL"];
for (const key of REQUIRED) {
  const val = process.env[key];
  if (!val || val === "" || val === `your-${key.toLowerCase()}-here`) {
    console.error(`[ENV] Missing required: ${key} — set it in config.env`);
    process.exit(1);
  }
}

function parseRedisUrl(url) {
  try {
    const u = new URL(url || "redis://localhost:6379/0");
    return { hostname: u.hostname, port: Number(u.port) || 6379, password: u.password || undefined };
  } catch {
    return { hostname: "localhost", port: 6379, password: undefined };
  }
}

export const config = {
  // ── Server ──────────────────────────────────────────────────────────────────
  port: Number(process.env.PORT_NUMBER) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  connString: process.env.CONN_STRING,
  secretKey: process.env.SECRET_KEY,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  clientUrl: process.env.CLIENT_URL,

  // ── Redis ─────────────────────────────────────────────────────────────────
  redisEnabled: (process.env.NODE_ENV !== "test") && !!process.env.REDIS_URL,
  redisUrl: parseRedisUrl(process.env.REDIS_URL),

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
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
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