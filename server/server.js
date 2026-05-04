import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import app from "./app.js";
import { initSocket } from "./utils/socket.js";
import { initRedis, closeRedis } from "./config/redis.js";
import { createQueues, closeQueues } from "./queues/index.js";
import { createServer } from "http";
import logger from "./utils/logger.js";
import { config } from "./config/env.js";
import "./config/dbConfig.js";

// ── Railway-compatible port binding ──────────────────────────────────────────
// Railway sets PORT env var — use it. Fall back to config.port (from config.env).
const PORT = Number(process.env.PORT || config.port || 3000);
const HOST = "0.0.0.0"; // Railway requires binding to 0.0.0.0

const httpServer = createServer(app);

// ── Boot sequence — sequential, no parallel, no fire-and-forget ───────────────
async function bootstrap() {
  // 1. Redis
  await initRedis();
  logger.info("[JULO] Redis initialized");

  // 2. Socket.IO (depends on Redis being ready)
  await initSocket(httpServer);
  logger.info("[JULO] Socket.IO initialized");

  // 3. Queues — deferred until after Redis is ready.
  //    This prevents BullMQ from trying to connect with a null Redis client.
  const { redis: redisExport } = await import("./config/redis.js");
  if (redisExport?.client) {
    await createQueues(redisExport.client);
    logger.info("[JULO] Queues initialized");
  }

  // 4. HTTP server
  await new Promise((resolve, reject) => {
    httpServer.listen(PORT, HOST, () => {
      logger.info(`[JULO] HTTP + Socket.IO listening on ${HOST}:${PORT} [${config.nodeEnv.toUpperCase()}]`);
      resolve();
    });
    httpServer.on("error", (err) => {
      logger.error("[JULO] HTTP server error", { error: err.message });
      reject(err);
    });
  });

  // 5. Startup verification — make a real HTTP request to ourselves.
  const baseUrl = `http://${HOST}:${PORT}`;
  const healthCheckUrls = [`${baseUrl}/`, `${baseUrl}/api/health`];
  for (const url of healthCheckUrls) {
    try {
      const resp = await fetch(url);
      logger.info(`[JULO] Startup health OK — ${url} → ${resp.status}`);
    } catch (err) {
      logger.error(`[JULO] Startup health FAIL — ${url}`, { error: err.message });
      // Server is listening but health check fails — log but don't exit.
      // This could mean the route isn't mounted yet (async Swagger registration).
    }
  }

  logger.info("[JULO] Boot complete");
}

bootstrap().catch((err) => {
  logger.error("[JULO] Bootstrap failed", { error: err.message, stack: err.stack });
  process.exit(1);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[JULO] ${signal} — graceful shutdown initiated`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info("[JULO] HTTP server closed");
    try {
      await closeQueues();
      await closeRedis();
      logger.info("[JULO] All connections closed");
    } catch (err) {
      logger.error("[JULO] Shutdown error", { error: err.message });
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown stalls
  setTimeout(() => {
    logger.error("[JULO] Forced shutdown after timeout");
    process.exit(1);
  }, 15_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));