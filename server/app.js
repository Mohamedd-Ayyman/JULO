import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config } from "./config/env.js";
import { globalErrorHandler, notFoundHandler } from "./utils/errorHandler.js";
import { requestLogger } from "./utils/logger.js";
import { requestTracer, perUserRateLimit } from "./middlewares/cacheMiddleware.js";
import { initRedis } from "./config/redis.js";
import logger from "./utils/logger.js";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const app = express();

// ── Debug Logging ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    logger.debug(`[Preflight] OPTIONS ${req.url} from ${req.headers.origin}`);
  }
  next();
});

// ── CORS Hardening ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  config.clientUrl,
  "https://julo-navy.vercel.app",
  "https://julo-git-main-mohamed-aymans-projects-8572de39.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Session-Id", "X-Token-Family", "X-Idempotency-Key"],
  maxAge: 86400, // 24 hours preflight cache
}));

// ── Security ────────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// ── Swagger UI ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openApiPath = resolve(__dirname, "../docs/openapi.yaml");
let openApiSpec = null;
try {
  const raw = await readFile(openApiPath, "utf8");
  openApiSpec = YAML.parse(raw);
} catch (err) {
  logger.warn("[Swagger] OpenAPI spec not loaded", { error: err.message });
}
if (openApiSpec) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
}

// ── Stripe webhook (raw body required BEFORE general JSON parsing) ───────────
app.use("/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Root health check
app.get("/", (req, res) => {
  res.send({ success: true, message: "JULO API is running", statusCode: 200 });
});

// ── Observability ──────────────────────────────────────────────────────────────
app.use(requestTracer);
app.use(requestLogger);

// ── Rate limiting (Skipping OPTIONS) ──────────────────────────────────────────
const skipOptions = (req) => req.method === "OPTIONS";

app.use("/api/auth", rateLimit({
  windowMs: config.rateLimit.authWindow,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { success: false, message: "Too many requests, please try again later.", statusCode: 429 },
}));

app.use("/api", rateLimit({
  windowMs: config.rateLimit.apiWindow,
  max: config.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { success: false, message: "Too many requests, please try again later.", statusCode: 429 },
}));

// ── API v1 router ──────────────────────────────────────────────────────────────
const v1 = express.Router();

// Per-user Redis rate limit (logged-in routes only, skip OPTIONS)
v1.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  perUserRateLimit(req, res, next);
});

import authRouter from "./controllers/authController.js";
import userRouter from "./controllers/userController.js";
import chatRouter from "./controllers/chatController.js";
import messageRouter from "./controllers/messageController.js";
import postRouter from "./controllers/postController.js";
import followRouter from "./controllers/followController.js";
import notificationRouter from "./controllers/notificationController.js";
import uploadRouter from "./controllers/uploadController.js";
import billingRouter from "./controllers/billingController.js";
import storyRouter from "./controllers/storyController.js";

v1.use("/auth", authRouter);
v1.use("/user", userRouter);
v1.use("/chat", chatRouter);
v1.use("/message", messageRouter);
v1.use("/post", postRouter);
v1.use("/follow", followRouter);
v1.use("/notification", notificationRouter);
v1.use("/upload", uploadRouter);
v1.use("/billing", billingRouter);
v1.use("/stories", storyRouter);

// Stripe webhook controller
import { stripeWebhookController } from "./controllers/stripeWebhookController.js";
app.post("/webhooks/stripe", stripeWebhookController);

// API Health check
v1.get("/health", (req, res) => {
  res.send({ success: true, uptime: process.uptime(), ts: new Date().toISOString(), statusCode: 200 });
});

// Mount v1
app.use("/api", v1);
app.use("/api/v1", v1);

// Global handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
