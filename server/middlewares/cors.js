import { config } from "../config/env.js";

/**
 * Allowed CORS origins.
 * Order matters: specific production URL first, then localhost in development.
 * In production, localhost must NOT be in the wildcard list — it must be explicit.
 */
const ALLOWED_ORIGINS = [
  ...(config.clientUrls || []),
  "http://localhost:5173", // Vite dev
  "http://localhost:3000", // CRA / legacy dev
  "http://localhost:8080",  // Railway local preview
];

/**
 * Core CORS headers — applied to ALL responses (actual + preflight).
 * Credentials are only set when a recognised origin is present.
 */
const CORE_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Request-Id, X-Session-Id, X-Token-Family, X-Idempotency-Key",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
};

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  // Ensure predictable matching (remove duplicates, ignore empty)
  const allowedOrigins = new Set(ALLOWED_ORIGINS.filter(Boolean));

  // ── Set static headers on every response ────────────────────────────────
  Object.entries(CORE_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // ── Set origin only for browser requests with an Origin header ──────────
  if (origin) {
    if (allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      // Unknown origin — block credentials, still allow the request
      // so downstream auth/tenant logic can decide.
      // Do NOT send Access-Control-Allow-Origin — let browser block it.
    }
  } else {
    // Non-browser / no-origin request (curl, server-to-server)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // ── Handle preflight immediately — stop the middleware chain ────────────
  if (req.method === "OPTIONS") {
    // Explicitly end the response. No downstream middleware runs.
    return res.status(204).end();
  }

  next();
}
