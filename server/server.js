import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import app from "./app.js";
import { initSocket } from "./utils/socket.js";
import { initRedis, closeRedis } from "./config/redis.js";
import { closeQueues } from "./queues/index.js";
import { createServer } from "http";
import logger from "./utils/logger.js";
import { config } from "./config/env.js";
import "./config/dbConfig.js";

const httpServer = createServer(app);

// Boot sequence
await initRedis();
await initSocket(httpServer);

httpServer.listen(config.port, "0.0.0.0", () => {
  logger.info(`[JULO] HTTP + Socket.IO listening on port ${config.port} [${config.nodeEnv.toUpperCase()}]`);
  if (config.isProduction) {
    logger.info("[JULO] Running in PRODUCTION mode — ensure config.env is properly set");
  }
});

// Graceful shutdown — drain connections before exit
const shutdown = async (signal) => {
  logger.info(`[JULO] ${signal} received — graceful shutdown initiated`);

  httpServer.close(async () => {
    logger.info("[JULO] HTTP server closed");
    try {
      await closeQueues();
      await closeRedis();
      logger.info("[JULO] All connections closed cleanly");
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

// Unhandled rejection guard
process.on("unhandledRejection", (reason) => {
  logger.error("[JULO] Unhandled Rejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("[JULO] Uncaught Exception", { error: err.message, stack: err.stack });
  process.exit(1);
});
