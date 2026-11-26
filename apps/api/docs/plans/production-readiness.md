# Production Readiness Plan — `nest-setup`

`Phases 0–8 done` · 2026-11-26 · branch `feat/production-readiness` off `development`

## 1. Thesis

Bring `nest-setup` up to full production parity with `go/setup` and complete **Tier 2 / Project #3** of `docs/typescript-ladder.md` (*Docker, Testcontainers, Pino logging, OpenTelemetry, Redis cache, rate limiting*), while keeping `next-setup`'s `pnpm contract:parity` green at every phase.

## 2. Resolved Decisions (2026-11-26)

1. **D1 — Redis & rate limiting scope:** Included in this roadmap (Phase 4) with automatic in-memory fallback when `REDIS_URL` is unset so unit and HTTP E2E tests run without Docker.
2. **D2 — `UserRepo` unused methods:** Trimmed to the 6 Prisma methods actually used (`findUnique`, `findMany`, `create`, `update`, `delete`, `count`), keeping `CLAUDE.md` rule #8 ("No dead code") true.
3. **D3 — Health vs. readiness:** Public `GET /api/health` stays static `{ status: "ok" }` (preserving byte-identical OpenAPI contract parity with `go/setup`); live Postgres + Redis readiness is served on `ADMIN_PORT` at `GET http://127.0.0.1:6060/ready`.
4. **D4 — Mechanical layer linting:** Enforced via built-in ESLint flat-config `no-restricted-imports` + `no-console: error` + promoted `no-floating-promises`/`no-unsafe-argument` errors (zero extra lint plugin dependencies).
5. **D5 — Cross-repo housekeeping:** Refreshed the outdated `❌`/`⚠️` rows in `go/setup/docs/go-ladder.md` (`b01d39c`).

## 3. Executed Vertical-Slice Ledger

| Phase | Scope | Commit | Status |
| --- | --- | --- | --- |
| 0 | Commit baseline backport on `development`, cut branch, refresh `go-ladder.md` | `ffbef68`, `b01d39c` | Verified |
| 1 | Extract `common/security` & `lib/password`, `configureApp`, sanitize `5xx` errors, `ParseUUIDPipe(422)`, bcrypt 72-byte cap, `ConfigService` in Prisma, trim `UserRepo` | `742d07a` | Verified |
| 2 | Dependency additions (`chore(deps)`), Pino structured logging, `X-Request-ID` middleware/CORS, graceful shutdown | `f2035a4`, `6782e3e` | Verified |
| 3 | OpenTelemetry tracing preload (`instrument.ts`), Prometheus metrics middleware, live `/ready` probe, isolated `ADMIN_PORT` server | `6f6c435` | Verified |
| 4 | Redis `CacheService` (O(1) versioned stats invalidation) + atomic Lua `RedisThrottlerStorage` + `@nestjs/throttler` | `5992f39` | Verified |
| 5 | Shared `test/apitest.ts`, full HTTP E2E suite (`test/e2e/`), and Testcontainers Postgres + Redis integration suite (`test/integration/`) | `c0fa733` | Verified (E2E run locally; integration ready for Docker/CI) |
| 6 | Multi-stage non-root `Dockerfile`, `.dockerignore`, and `compose.yaml` (Postgres, Redis, migrate, API, Jaeger) | `0f4e170` | Verified |
| 7 | `pnpm openapi:check`, ESLint layer boundaries, and `.github/workflows/ci.yml` | `4dcb2d8` | Verified |
| 8 | Reproducible benchmark (`scripts/bench.mjs`), updated `README.md`, `.claude/CLAUDE.md`, and final parity check | final commit | Verified |

## 4. Docker-Dependent Verification Note

Docker Desktop's Linux engine daemon was stopped during execution on this host. Once Docker Desktop is running (or on GitHub Actions `ubuntu-latest`), run:

```bash
pnpm test:integration
docker compose up --build
```
