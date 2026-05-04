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
import { initSocket } from "./utils/socket.js";
import logger from "./utils/logger.js";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

// ── Pre-boot: Redis ─────────────────────────────────────────────────────────────
await initRedis();

const app = express();

// ── Swagger UI ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openApiPath = resolve(__dirname, "../docs/openapi.yaml");
let openApiSpec = null;
try {
  const raw = await readFile(openApiPath, "utf8");
  openApiSpec = YAML.parse(raw);
} catch (err) {
  logger.warn("[Swagger] OpenAPI spec not loaded", { error: err.message, path: openApiPath });
}
if (openApiSpec) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
}

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

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Session-Id", "X-Token-Family", "X-Idempotency-Key"],
}));

// Handle preflight requests
app.options(/.*/, cors());

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

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api/auth", rateLimit({
  windowMs: config.rateLimit.authWindow,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later.", statusCode: 429 },
}));

app.use("/api", rateLimit({
  windowMs: config.rateLimit.apiWindow,
  max: config.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later.", statusCode: 429 },
}));

// ── API v1 router ──────────────────────────────────────────────────────────────
const v1 = express.Router();

// Per-user Redis rate limit (logged-in routes only)
v1.use(perUserRateLimit);

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

// ── Stripe webhook — mounted at app level (before v1) for raw body access ───────
import { stripeWebhookController } from "./controllers/stripeWebhookController.js";
app.post("/webhooks/stripe", stripeWebhookController);

// Health check
v1.get("/health", (req, res) => {
  res.send({ success: true, uptime: process.uptime(), ts: new Date().toISOString(), statusCode: 200 });
});

// Prometheus metrics — JULO platform metrics
v1.get("/metrics", (req, res) => {
  const mem = process.memoryUsage();
  res.set("Content-Type", "text/plain");
  res.send([
    `# HELP julo_uptime_seconds Server uptime in seconds`,
    `# TYPE julo_uptime_seconds gauge`,
    `julo_uptime_seconds ${process.uptime().toFixed(2)}`,
    `# HELP julo_heap_used_bytes Used heap memory`,
    `# TYPE julo_heap_used_bytes gauge`,
    `julo_heap_used_bytes ${mem.heapUsed}`,
    `# HELP julo_heap_total_bytes Total heap memory`,
    `# TYPE julo_heap_total_bytes gauge`,
    `julo_heap_total_bytes ${mem.heapTotal}`,
    `# HELP julo_rss_bytes Resident set size`,
    `# TYPE julo_rss_bytes gauge`,
    `julo_rss_bytes ${mem.rss}`,
    `# HELP julo_external_bytes External memory`,
    `# TYPE julo_external_bytes gauge`,
    `julo_external_bytes ${mem.external}`,
    `# HELP julo_process_active_handles Active handles in event loop`,
    `# TYPE julo_process_active_handles gauge`,
    `julo_process_active_handles ${process._activeHandles?.length || 0}`,
    `# HELP julo_process_active_requests Active requests in event loop`,
    `# TYPE julo_process_active_requests gauge`,
    `julo_process_active_requests ${process._activeRequests?.length || 0}`,
  ].join("\n"));
});

// Mount v1 at both /api (legacy) and /api/v1 (canonical)
app.use("/api", v1);
app.use("/api/v1", v1);

// ── Global handlers ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
