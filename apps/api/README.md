# NestJS API Starter

A layered NestJS + Prisma + PostgreSQL + Redis API that publishes its contract as `openapi.json`. It is the TypeScript counterpart of `go/setup`: same routes, same `{ statusCode, message, data, timestamp }` envelope, same `{ statusCode, message, error, timestamp }` error shape, same RS256 tokens. The paired frontend, `next-setup`, generates its Zod schemas and typed routes from that file.

## Getting started

Create `.env` and generate an RS256 key pair:

```bash
cp .env.example .env
pnpm keys:generate
```

Paste the backend lines into `.env` and the public key into `next-setup`'s `.env`. The private key signs and never leaves the backend; the frontend proxy only verifies.

### With Docker

Needs Docker only.

```bash
docker compose up --build
docker compose run --rm --entrypoint pnpm migrate db:seed
```

Compose starts Postgres and Redis, applies Prisma migrations, then boots the API and Jaeger. The second command seeds `admin@example.com` / `password123` plus 20 members.

### Without Docker

Needs Node 22+, pnpm 12+, and a running PostgreSQL (Redis is optional locally; when `REDIS_URL` is unset, caching and throttling fall back to in-memory stores).

```bash
pnpm install
pnpm exec prisma migrate dev
pnpm db:seed
pnpm start:dev
```

The API serves on `http://localhost:5000/api`, with Swagger UI at `/api/docs`.

## Architecture

```
client ──HTTP :5000/api──► RequestID ─► Metrics ─► Pino ─► Throttler (Redis)
                                                             │
                                               JwtAuthGuard + RolesGuard
                                               (src/common/security)
                                                             │
                                         ValidationPipe + ParseUUIDPipe (422)
                                                             │
                                         Controller ─► Service ─► UserRepo ─► Prisma ─► PostgreSQL
                                                          │
                                                          └──► CacheService ─► Redis
                                                                (versioned stats invalidation)

admin ──HTTP 127.0.0.1:6060──► /metrics (Prometheus) · /ready (Postgres + Redis)
traces ─OTLP HTTP────────────► Jaeger (:16686)
```

### Trade-offs

- **Acyclic shared security (`common/security`):** Guards, decorators, and `AuthUser`/`JwtPayload` live in `common/security` rather than `modules/core/auth` (mirroring `go/setup/internal/common/security`). ESLint enforces one-way module imports mechanically via `no-restricted-imports`.
- **Isolated admin port (`ADMIN_PORT=6060`):** Prometheus `/metrics` and live `/ready` probes run on a separate HTTP server bound to `127.0.0.1` in Compose, keeping public `GET /api/health` static and byte-compatible with `go/setup`'s OpenAPI contract while never exposing internal metrics publicly.
- **Versioned O(1) cache invalidation:** `StatsService` keys include a monotonic counter (`stats:users:version`) incremented on user creation and deletion. This avoids `KEYS *` / `SCAN` sweeps in Redis while keeping invalidation immediate.
- **Optional Redis in local/unit tests:** `CacheService` and `RedisThrottlerStorage` use `ioredis` (with an atomic Lua increment script for distributed throttling) when `REDIS_URL` is set, and fall back to in-memory maps when unset so unit and HTTP E2E suites run without Docker.

## Observability

| What | Where |
| --- | --- |
| Request ID | Every response carries `X-Request-ID`. Safe caller IDs are echoed; otherwise a UUIDv4 is generated. |
| Access log | Structured Pino logs (`pino-pretty` in dev, JSON in prod) with `req.id`, method, path, status, redacted auth headers, and `trace_id` when tracing is active. |
| Metrics | Prometheus exposition at `http://localhost:6060/metrics` (`http_server_requests_total`, `http_server_request_duration_seconds`, and Node runtime collectors) labeled by matched route pattern. |
| Readiness | Live dependency check at `http://localhost:6060/ready` verifying PostgreSQL (`SELECT 1`) and Redis (`PING`, when configured). |
| Traces | OpenTelemetry spans for HTTP, Express, and `pg` queries preloaded via `src/instrument.ts`, exported when `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is set (Jaeger at `http://localhost:16686` in Compose). |

## What ships

| Module | Routes |
| --- | --- |
| `auth` | `POST /auth/register`, `POST /auth/login` (strict rate limit: 10 req/min) |
| `users` | CRUD on `/users` (paginated `limit`/`offset`, UUID param validation, 72-byte bcrypt cap), plus `GET /users/me` |
| `stats` | `GET /stats/users/total`, `GET /stats/users/series` (Redis-cached, invalidated on user writes) |
| `health` | `GET /health` |

## Commands

| Task | Command |
| --- | --- |
| Run the API (dev) | `pnpm start:dev` |
| Build | `pnpm build` |
| Unit tests | `pnpm test` |
| HTTP E2E tests (no Docker) | `pnpm test:e2e` |
| Integration tests (Docker / Testcontainers) | `pnpm test:integration` |
| Type-check & lint | `pnpm type-check` · `pnpm lint` |
| Regenerate / check OpenAPI contract | `pnpm openapi` · `pnpm openapi:check` |
| Run stack in Docker | `docker compose up --build` |
| Seed database | `pnpm db:seed` |
| Generate RS256 key pair | `pnpm keys:generate` |
| Reproducible HTTP benchmark | `pnpm bench` |

## Benchmark

Measured locally on Node `v22.19.0` (Windows, single host running client + compiled `dist/` Nest HTTP pipeline, 20 concurrent workers, RS256 verification enabled on authenticated routes) via `pnpm bench`:

| Endpoint | Requests | Throughput | p50 | p95 | p99 | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/health` | 1,000 | 176 req/s | 88.3 ms | 278.3 ms | 550.2 ms | Unauthenticated, full middleware + metrics + envelope |
| `GET /api/users?limit=20&offset=0` | 500 | 139 req/s | 134.2 ms | 198.6 ms | 224.8 ms | RS256 JWT + `RolesGuard` + `PageQueryDto` validation |
| `GET /api/stats/users/series?period=day` | 500 | 141 req/s | 130.1 ms | 247.3 ms | 280.6 ms | **1 repository read** across all 500 requests (99.8% cache hit rate) |

Re-run anytime with `pnpm bench`.

## Conventions

The binding architecture rules live in [.claude/CLAUDE.md](.claude/CLAUDE.md): controller → service → repository → Prisma, acyclic `common/security`, DTOs as the validation and OpenAPI source, and the dual-backend parity workflow with `go/setup` and `next-setup`.
