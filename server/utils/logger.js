import { config } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Enhanced request logger with tracing + metrics.
 */
const { createLogger, format, transports } = await import("winston");

const jsonFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.json(),
);

const consoleFormat = format.combine(
  format.timestamp({ format: "HH:mm:ss" }),
  format.colorize(),
  format.printf(({ level, message, timestamp, requestId, ...rest }) => {
    const rid = requestId ? ` [${requestId.slice(0, 8)}]` : "";
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
    const stack = rest.stack ? `\n  ${rest.stack}` : "";
    return `${timestamp} [${level}]${rid} ${message}${meta}${stack}`;
  }),
);

const loggerTransports = [
  new transports.Console({
    format: config.isProduction ? jsonFormat : consoleFormat,
  }),
  ...(config.isProduction
    ? [
        new transports.File({
          filename: "logs/error.log",
          level: "error",
          maxsize: 5 * 1024 * 1024,
          maxFiles: 5,
        }),
        new transports.File({
          filename: "logs/combined.log",
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
        }),
        new transports.File({
          filename: "logs/access.log",
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      ]
    : []),
];

const appLogger = createLogger({
  level: config.isProduction ? "info" : "debug",
  transports: loggerTransports,
  exitOnError: false,
});

// Winston default export
const winstonLogger = appLogger;
export default winstonLogger;

/**
 * Morgan-style request logging with requestId tracing.
 */
export const requestLogger = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId;
  res.set("X-Request-Id", requestId);

  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    winstonLogger.log({
      level,
      message: `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: ms,
      requestId,
      userId: req.user?.userId || null,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  });

  next();
};

/**
 * Metrics logger — emits structured metrics every 60s.
 */
export const metricsLogger = () => {
  setInterval(() => {
    const mem = process.memoryUsage();
    winstonLogger.info("metrics", {
      type: "metrics",
      uptime: process.uptime().toFixed(2),
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      timestamp: new Date().toISOString(),
    });
  }, 60_000);
};

export { appLogger as logger };
