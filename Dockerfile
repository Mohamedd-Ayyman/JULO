# ── Server Dockerfile ─────────────────────────────────────────────────────────
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build 2>/dev/null || true

FROM node:22-alpine AS server-runner
WORKDIR /app/server
ENV NODE_ENV=production
RUN addgroup -S julo && adduser -S julo -G julo

# Copy installed deps
COPY --from=server-deps /app/server/node_modules ./node_modules
# Copy application code
COPY --chown=julo:julo server/ ./

USER julo
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "server.js"]

# ── Client Dockerfile ──────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS client-deps
WORKDIR /app/client
COPY client/package*.json ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS client-builder
WORKDIR /app/client
COPY client/ ./
RUN bun run build

FROM nginx:1.27-alpine AS client-runner
COPY --from=client-builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

# ── Dockerfile.dev (full rebuild each change) ─────────────────────────────────
FROM node:22-alpine AS dev
WORKDIR /app
COPY . .
RUN npm ci 2>/dev/null || npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]