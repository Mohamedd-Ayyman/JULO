import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config } from "./config/env.js";
import { globalErrorHandler, notFoundHandler } from "./utils/errorHandler.js";
import { requestLogger } from "./utils/logger.js";
import { requestTracer, perUserRateLimit } from "./middlewares/cacheMiddleware.js";
import logger from "./utils/logger.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { corsMiddleware } from "./middlewares/cors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── App instance ────────────────────────────────────────────────────────
const app = express();

// ── 1. CORS ─ FIRST middleware. Handles ALL origins and ALL preflights. ────────
// No downstream middleware can run before CORS sets headers.
// CORS middleware ends OPTIONS responses immediately — nothing else touches them.
app.use(corsMiddleware);

// ── 2. Trust proxy (Railway / Vercel / load balancers) ───────────────────────
// Required for correct req.ip behind Railway's edge proxy.
app.set("trust proxy", 1);

// ── 3. Security ────────────────────────────────────────────────────────
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

// ── 4. Raw body for Stripe webhooks — must be BEFORE express.json() ───────────
app.use("/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }));

// ── 5. Body parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// ── 6. Root health — no auth, no tracing, available immediately ───────────────
app.get("/", (_req, res) => {
  res.status(200).json({ success: true, message: "JULO API is running", statusCode: 200 });
});

// ── 7. Request tracing ────────────────────────────────────────────────
app.use(requestTracer);

// ── 8. Request logging ─────────────────────────────────────────────────
app.use(requestLogger);

// ── 9. Swagger UI — lazy loaded, non-blocking ──────────────────────────
const openApiPath = resolve(__dirname, "../docs/openapi.yaml");
const swaggerPromise = readFile(openApiPath, "utf8")
  .then((raw) => YAML.parse(raw))
  .catch(() => null); // non-fatal — spec missing is not a server error

swaggerPromise.then((openApiSpec) => {
  if (openApiSpec) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
    logger.info("[Swagger] OpenAPI spec loaded");
  }
});

// ── 10. Rate limiting ─────────────────────────────────────────────────
// OPTIONS requests are NOT routed through Express by the time they reach here
// (corsMiddleware ends them), so skip logic is belt-and-suspenders.
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

// ── 11. API v1 router ─────────────────────────────────────────────────
const v1 = express.Router();

// Per-user Redis rate limit — wrapped in try/catch so Redis failure never blocks requests.
// Falls back to allowing all traffic if Redis is unavailable.
v1.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  perUserRateLimit(req, res, next).catch((err) => {
    logger.error("[perUserRateLimit] Redis error — allowing request through", { error: err.message });
    next();
  });
});

// Route imports
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
import consentRouter from "./controllers/consentController.js";
import auditRouter from "./controllers/auditController.js";
import recordingRouter from "./controllers/recordingController.js";
import { stripeWebhookController } from "./controllers/stripeWebhookController.js";

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
v1.use("/consent", consentRouter);
v1.use("/audit", auditRouter);
v1.use("/recordings", recordingRouter);

// Stripe webhook — raw body already parsed at step 4
app.post("/webhooks/stripe", stripeWebhookController);

// Health check
v1.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    uptime: process.uptime(),
    ts: new Date().toISOString(),
    statusCode: 200,
  });
});

// Mount v1 at /api (legacy) and /api/v1 (canonical)
app.use("/api", v1);
app.use("/api/v1", v1);

// ── 12. Serve static client build ───────────────────────────────────────────
const clientDistPath = resolve(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// ── 13. SPA catch-all — serve index.html for all non-API GET requests ─────
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/webhooks")) {
    return next();
  }
  res.sendFile(resolve(clientDistPath, "index.html"), (err) => {
    if (err) next();
  });
});

// ── 14. Global handlers — MUST be last ───────────────────────────────────────
// Handlers are registered once in server.js (uncaughtException / unhandledRejection).
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
