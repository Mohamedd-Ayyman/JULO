import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import app from "./app.js";
import { initSocket } from "./utils/socket.js";
import { initRedis, closeRedis, redis as redisExport } from "./config/redis.js";
import { createQueues, closeQueues } from "./queues/index.js";
import { createServer } from "http";
import logger from "./utils/logger.js";
import { config } from "./config/env.js";
import "./config/dbConfig.js";

// ── Railway-compatible port binding ──────────────────────────────────────────
const PORT = Number(process.env.PORT || config.port || 3000);
const HOST = "0.0.0.0";

const httpServer = createServer(app);

// ── Boot sequence ─────────────────────────────────────────────────────────────
async function bootstrap() {
  // 1. Redis
  await initRedis();
  logger.info("[JULO] Redis ready");

  // 2. Socket.IO
  await initSocket(httpServer);
  logger.info("[JULO] Socket.IO ready");

  // 3. Queues — only after Redis is confirmed ready
  if (redisExport?.client) {
    await createQueues(redisExport.client);
    logger.info("[JULO] Queues ready");
  } else {
    logger.info("[JULO] Queues skipped (no Redis client)");
  }

  // 4. HTTP server
  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);

    httpServer.listen(PORT, HOST, () => {
      logger.info(`[JULO] Listening on ${HOST}:${PORT} [${config.nodeEnv.toUpperCase()}]`);
      resolve();
    });
  });
}

bootstrap()
  .then(() => logger.info("[JULO] Boot complete"))
  .catch((err) => {
    // Log full details so Railway shows them in the logs panel
    console.error("[JULO] Bootstrap failed:", err);
    logger.error("[JULO] Bootstrap failed", {
      message: err?.message ?? String(err),
      stack: err?.stack,
      name: err?.name,
    });
    process.exit(1);
  });

// ── Graceful shutdown ──────────────────────────────────────────────────────────
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[JULO] ${signal} — shutting down`);

  httpServer.close(async () => {
    logger.info("[JULO] HTTP server closed");
    try {
      await closeQueues();
      await closeRedis();
    } catch (e) {
      logger.error("[JULO] Shutdown error", { error: e?.message });
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("[JULO] Forced shutdown after timeout");
    process.exit(1);
  }, 15_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));