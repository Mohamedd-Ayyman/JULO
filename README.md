# JULO

Production-ready real-time social platform — MERN + Socket.IO + Redis + BullMQ.

## Quick Start

```bash
# Development
cp server/.env.example server/.env    # fill in SECRET_KEY + CONN_STRING
cp client/.env.example client/.env

docker compose up -d                 # MongoDB + Redis + Server + Client
# or without Docker:
cd server && npm run dev
cd client && npm run dev

# Production
cp server/.env.example server/.env
docker compose -f docker-compose.prod.yml up -d
```

## Architecture

```
client/         React 19, Vite, Tailwind 4, Redux Toolkit, Socket.IO client
server/
  config/       env.js, dbConfig.js, redis.js
  controllers/  HTTP route handlers (thin — delegate to services)
  services/     Business logic layer (auth, post, chat, user, follow, notification)
  models/        Mongoose schemas
  middlewares/  authMiddleware, cacheMiddleware
  utils/         AppError, validate, logger, errorHandler, socket
  queues/        BullMQ notification + email job queues
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind 4, Redux Toolkit |
| Backend | Express 5, Node.js 22 |
| Database | MongoDB 7 (Mongoose 8) |
| Cache/Queue | Redis 7 + BullMQ |
| Real-time | Socket.IO (Redis adapter for horizontal scale) |
| Images | Cloudinary (Multer) |
| Auth | JWT (7d) |
| Security | Helmet, express-rate-limit, Zod validation |
| Observability | Winston (JSON logs), request tracing, Prometheus metrics |
| Containerization | Docker + Docker Compose |

## Features

- Real-time messaging with typing indicators + reactions + edit/delete
- Social feed with like, comment, share, bookmark
- Follow system with suggestions
- Real-time notifications via BullMQ
- Redis-cached queries (feed, profile, search)
- Per-user rate limiting (Redis sliding window)
- Cursor-based pagination ready
- API versioning (`/api/v1`)
- Prometheus metrics endpoint (`/api/v1/metrics`)
- Health check (`/api/v1/health`)
- Service layer architecture (controllers → services → data access)

## Environment Variables

**Server** (`server/config.env` or `server/.env`):

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT_NUMBER` | Server port (default: 3000) | Yes |
| `CONN_STRING` | MongoDB connection string | Yes |
| `SECRET_KEY` | JWT signing secret (64+ chars) | Yes |
| `REDIS_URL` | Redis URL (e.g. `redis://:pass@host:6379/0`) | No (gracefully skipped) |
| `CLIENT_URL` | Frontend URL for CORS | Yes |
| `JWT_EXPIRES_IN` | Token expiry (default: 7d) | No |
| `CLOUDINARY_*` | Image upload credentials | No |

## Scripts

```bash
npm run dev          # Server with nodemon
npm run start        # Server production
npm run worker       # BullMQ worker (separate process)
npm run test         # Run tests
npm run test:coverage # With coverage report
npm run seed         # Seed test users
```
