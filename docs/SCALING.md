# Nuvora — Scaling Strategy

## Infrastructure Overview

```
                    ┌─────────────────────────┐
                    │     Cloud Load Balancer  │
                    │   (AWS ALB / Cloudflare) │
                    └───────────┬─────────────┘
                                │
                ┌───────────────▼───────────────┐
                │  NGINX (SSL termination +    │
                │  rate limiting + gzip +       │
                │  static asset caching)        │
                └───────────┬───────────────────┘
                            │ HTTP / WebSocket
              ┌─────────────▼──────────────┐
              │  Nuvora Server Replicas     │
              │  (auto-scaled, stateless)   │
              │  Node.js + Socket.IO        │
              └─────────────┬──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
  ┌─────▼─────┐     ┌──────▼──────┐    ┌─────▼──────┐
  │  MongoDB   │     │   Redis     │    │  BullMQ     │
  │ replica   │     │  Cluster    │    │  Workers   │
  │ set (3x)  │     │  (3x masters)│    │            │
  └───────────┘     └─────────────┘    └────────────┘
```

## Horizontal Pod Autoscaling (Kubernetes)

```yaml
# k8s/hpa-server.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nuvora-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nuvora-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

## MongoDB Replica Set

- **1 primary + 2 secondaries** minimum for production
- **Read preference**: `secondaryPreferred` for analytics/reports; `primary` for all writes
- **Write concern**: `majority` for financial/payment data; `w:1` for social feeds (acceptable data loss)
- **Oplog size**: 50GB on primary for adequate replication window
- **Index strategy**: Compound indexes on all tenantId-scoped queries; TTL index on sessions.expiresAt

## Redis Cluster

- **3 master nodes** minimum (AWS ElastiCache or Redis Cluster)
- **maxmemory-policy**: `allkeys-lru` on read-heavy workloads; `volatile-lru` if persistence matters
- **Persistence**: AOF every 1 second (`appendfsync everysec`)
- **Key patterns**:
  - `ratelimit:*` — short TTL (<2 min)
  - `cache:*` — TTL per route (10s–5 min)
  - `session:*` — never (in MongoDB)
  - `circuit:*` — 60s TTL

## BullMQ Scaling

- **Single queue per type** (notifications, emails) — partitions by tenant not needed until >10k jobs/min
- **Worker concurrency**: 5 workers per queue per Pod
- **Max attempts**: 3 with exponential backoff (1s, 4s, 16s)
- **Dead-letter queue**: Failed jobs moved to `dlq:<queue>` after all retries

## NGINX Configuration

- **Upstream**: Round-robin to all server replicas (stateless = no sticky sessions needed)
- **Rate limiting**: 30 req/s global; 5 req/min on `/api/auth/`
- **Caching**: Static assets via `proxy_cache_path` (10MB zone, 1y expiry)
- **WebSocket**: `proxy_read_timeout 86400` to prevent disconnect on idle

## Environment Separation

| Variable | Development | Staging | Production |
|---------|-------------|---------|-----------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT_NUMBER` | `3000` | `3001` | `3000` |
| `REDIS_URL` | `redis://localhost:6379` | `redis://staging:6379` | `redis://cluster:6379` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `SENTRY_DSN` | unset | staging DSN | production DSN |
| `STRIPE_MODE` | test | test | live |

Run staging: `docker-compose -f docker-compose.prod.yml -f docker-compose.staging.yml up`