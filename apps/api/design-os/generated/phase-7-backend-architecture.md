# Phase 7 — Backend Architecture

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 6 — Integration Contracts](phase-6-integration-contracts.md) · Next: [Phase 8 — Implementation Roadmap](phase-8-implementation-roadmap.md)

This phase is the only home for **code organisation**. It follows the host conventions in [`apps/api/CLAUDE.md`](../../CLAUDE.md), which win wherever they speak, and reconciles them with Phases 1–6.

## Table of contents

1. [Host conventions applied](#1-host-conventions-applied)
2. [Folder structure](#2-folder-structure)
3. [Module map](#3-module-map)
4. [Layering and dependency direction](#4-layering-and-dependency-direction)
5. [Request pipeline](#5-request-pipeline)
6. [Configuration and environment](#6-configuration-and-environment)
7. [Persistence](#7-persistence)
8. [Error handling](#8-error-handling)
9. [Authentication and authorisation](#9-authentication-and-authorisation)
10. [Rate limiting](#10-rate-limiting)
11. [Caching](#11-caching)
12. [Storage and CDN](#12-storage-and-cdn)
13. [Jobs and cron](#13-jobs-and-cron)
14. [Contract generation](#14-contract-generation)
15. [Logging, monitoring, error tracking](#15-logging-monitoring-error-tracking)
16. [Environments and deployment](#16-environments-and-deployment)
17. [Naming conventions](#17-naming-conventions)
18. [Performance strategy](#18-performance-strategy)
19. [Security hardening](#19-security-hardening)
20. [Dependencies to propose](#20-dependencies-to-propose)
21. [Spec vs code reconciliation](#21-spec-vs-code-reconciliation)

---

## 1. Host conventions applied

| Host rule | How this OS applies it |
| --- | --- |
| One job per file; split over ~150 lines | Public and admin controllers are separate files per domain; catalogue admin splits per resource |
| Prisma only in `src/common/repos/<domain>.repo.ts` | One repo per aggregate: `catalogue`, `build`, `enquiry`, `article`, `asset`, `admin-user`, `admin-session`, `catalogue-revision` |
| Controller → Service → Repo → Prisma | Pure logic (S-01, S-02, S-06, S-17, S-23, transition table) lives in `src/lib/`, called by services |
| Services never return raw Prisma models | Repos `select` against response DTOs, like the existing `userSelect` |
| Single source of truth | Error codes and rate-limit numbers in `common/enums/`; models in `schema.prisma`; validation in DTOs |
| No hardcoding | Limits, TTLs, budgets, secrets and URLs in env or `common/enums/` |
| No `console.*`; Nest `Logger` | Structured logger configured once (§15) |
| Relative `.js` imports, ESM | Unchanged |
| Contract from compiled `dist/` | Unchanged (§14) |

## 2. Folder structure

```
apps/api/
├── prisma/
│   ├── schema.prisma                 D-01–D-15
│   ├── migrations/                   committed, reviewed (BR-42)
│   └── seed.ts                       Phase 3 §13
├── scripts/                          generate-keys, copy-swagger-ui (existing)
├── vercel.json                       cron schedules, function max durations
├── src/
│   ├── main.ts · setup.ts · app.module.ts · openapi.emit.ts   (existing)
│   ├── common/
│   │   ├── config/        env.validation.ts (extended §6), jwt-keys.ts
│   │   ├── database/      prisma.module.ts, prisma.service.ts
│   │   ├── repos/         <aggregate>.repo.ts, repo.module.ts
│   │   ├── errors/        app.exception.ts, repo.error.ts, error-map.ts
│   │   ├── enums/         error-codes.ts, rate-limits.ts, cache.ts, auth.ts, assets.ts, enquiries.ts
│   │   ├── filters/       http-exception.filter.ts (reshaped §8), all-exceptions.filter.ts
│   │   ├── interceptors/  response.interceptor.ts, cache-headers.interceptor.ts
│   │   ├── guards/        cron-secret.guard.ts, origin.guard.ts, throttle.guard.ts
│   │   ├── middleware/    request-id.middleware.ts
│   │   ├── decorators/    api-envelope.decorator.ts, api-errors.decorator.ts, cache-class.decorator.ts, rate-limit.decorator.ts
│   │   └── dto/           api-envelope.dto.ts, api-error.dto.ts, cursor-page.dto.ts
│   ├── lib/                          pure, no Nest imports
│   │   ├── rules-engine/  resolve.ts, conflicts.ts, pricing.ts, types.ts (+ specs)   S-01, S-02
│   │   ├── avero-code.ts                                                            S-06
│   │   ├── glb.ts                                                                   S-17
│   │   ├── enquiry-status.ts                                                        S-09 table
│   │   ├── tiptap.ts                                                                S-12 body validation
│   │   ├── cursor.ts · etag.ts · period.ts (existing)                               S-23
│   └── modules/core/
│       ├── admin-auth/    (evolved from auth/)                                       S-18
│       ├── catalogue/     catalogue.controller.ts, admin-<resource>.controller.ts ×6, services, dto/   S-04, S-05
│       ├── configurator/  configurator.controller.ts, configurator.service.ts, snapshot.service.ts      S-01–S-03
│       ├── builds/        builds.controller.ts, admin-builds.controller.ts, builds.service.ts, build-analytics.service.ts   S-07, S-21
│       ├── enquiries/     enquiries.controller.ts, admin-enquiries.controller.ts, intake.service.ts, leads.service.ts, spam-guard.service.ts   S-08, S-09, S-20
│       ├── journal/       articles.controller.ts, admin-articles.controller.ts, journal-read.service.ts, journal-admin.service.ts, revalidation.service.ts   S-11, S-12, S-14
│       ├── media/         admin-media.controller.ts, media.service.ts, blob.service.ts   S-13, I-04
│       ├── assets/        assets.controller.ts, admin-assets.controller.ts, manifest.service.ts, asset-admin.service.ts   S-15, S-16
│       ├── jobs/          cron.controller.ts, retention.service.ts                      S-10, E-37, E-38
│       └── health/        (existing)                                                    S-22
└── test/
    ├── *.e2e-spec.ts                  integration against test Postgres
    └── fixtures/                      GLB fixtures for S-17
```

## 3. Module map

| Module | Services | Endpoints | Imports |
| --- | --- | --- | --- |
| admin-auth | S-18 | E-12–E-15 | repos, config |
| catalogue | S-04, S-05 | E-01, E-02, E-27–E-32 | repos, configurator (S-03 for E-03 defaults) |
| configurator | S-01–S-03 | E-03, E-09 | repos |
| builds | S-07, S-21 | E-05, E-10, E-19, E-20 | configurator, repos |
| enquiries | S-08, S-09, S-20 | E-11, E-16–E-18 | builds (resolve code), repos |
| journal | S-11, S-12, S-14 | E-06, E-07, E-21–E-25 | repos |
| media | S-13 | E-26 | — |
| assets | S-15, S-16, S-17 | E-04, E-33–E-36 | catalogue (offered codes), media (blob client), repos |
| jobs | S-10 | E-37, E-38 | enquiries, journal |
| health | S-22 | E-08 | database |
| common | S-19, S-23 | all | — |

No module imports a module that imports it back. `configurator` depends on nothing but repos; `builds` depends on `configurator`, never the reverse.

## 4. Layering and dependency direction

```
HTTP ─► Controller ─► Service ─► lib/ (pure)
                         │
                         └─► Repo ─► Prisma ─► Postgres
                         └─► Integration client (blob, revalidation, captcha, email)
```

- Controllers: params, body, cookies → service call → return a domain object. Cookies are set through a small response helper used only in the admin-auth controller.
- Services: business rules, transactions (`$transaction` is passed through the repo), `AppException`s.
- `lib/`: pure functions; unit-tested without Nest.
- Integration clients: one file per external system, injected, mocked in tests.

## 5. Request pipeline

In order:

1. `helmet()` (existing), with `crossOriginResourcePolicy` relaxed for `/docs` only.
2. CORS (existing), exact origins from `CORS_ORIGINS`, `credentials: true`.
3. Cookie parsing (new dependency, §20).
4. Request-ID middleware: reuse the platform request ID or generate one; set `x-request-id`.
5. Global prefix `api/v1` (existing).
6. Guards, in order: `ThrottleGuard` (route limits) → `CronSecretGuard` (jobs) → cookie `JwtAuthGuard` → `RolesGuard` (existing) → `OriginGuard` (admin writes).
7. `ValidationPipe` (existing: `whitelist`, `forbidNonWhitelisted`, `transform`), plus an `exceptionFactory` producing `VALIDATION_FAILED` with field details.
8. Controller → service.
9. Interceptors: `CacheHeadersInterceptor` (S-23, 304 handling) → `ResponseInterceptor` (existing envelope).
10. Filters: `HttpExceptionFilter` (reshaped) and `AllExceptionsFilter` (unknown → `INTERNAL_ERROR`, reported to error tracking).

## 6. Configuration and environment

Validated at boot in `common/config/env.validation.ts` (zod, existing). New variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | yes (existing) | I-12 |
| `CORS_ORIGINS` | yes (existing) | Frontend origins |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | yes (existing) | I-02 |
| `APP_ENV` | yes | `local` \| `staging` \| `production` |
| `COOKIE_DOMAIN` | prod/staging | `.avero.example` |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `SESSION_ABSOLUTE_TTL` | defaults 900 s / 7 d / 30 d | S-18 |
| `BEARER_AUTH_ENABLED` | default false | I-02 tooling switch |
| `CRON_SECRET` | yes | I-06, I-07 |
| `REVALIDATE_URL`, `REVALIDATE_SECRET` | yes | I-08 |
| `BLOB_READ_WRITE_TOKEN` | yes | I-03, I-04 |
| `CDN_HOST` | yes | URL prefix checks (S-16, S-12) |
| `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_REDIS_TOKEN` | if OD-01 = store | I-09 |
| `TURNSTILE_SECRET_KEY` | optional | I-10 |
| `ALERT_EMAIL_API_KEY`, `ALERT_EMAIL_TO` | optional | I-11 |
| `SENTRY_DSN` | optional | I-13 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | Phase 3 §13 |

Numbers that are policy, not secrets (rate limits, budgets, retention days, code alphabet), live in `common/enums/`.

## 7. Persistence

- **Repos** stay thin wrappers (host rule). Queries that need `unnest` (S-21) use Prisma's typed raw query inside the build repo — the one sanctioned raw query, documented in the repo.
- **Transactions:** S-05 (write + revision), S-09 (status + note), S-16 (live switch), S-18 (rotation). Interactive transactions with a 5 s timeout; no network calls inside.
- **Partial unique index** for INV-08 added in raw SQL inside the migration.
- **Migrations:** `pnpm db:migrate` locally; `prisma migrate deploy` against `DIRECT_URL` in the deploy step for staging and production.

## 8. Error handling

- `AppException(code, status, message, details?)` in `common/errors/`, with codes from `common/enums/error-codes.ts` (the [Phase 4 catalogue](phase-4-api-surface.md#2-error-catalogue)).
- `HttpExceptionFilter` emits `{ error: { code, message, details? } }`. Plain Nest `HttpException`s map by status (`NotFoundException` → a `*_NOT_FOUND` must be thrown explicitly; generic 404 → `RESOURCE_NOT_FOUND`).
- `RepoError` → mapped in services: unique violation → the matching `*_TAKEN`; FK violation → `CODE_IN_USE`; connection errors → `SERVICE_UNAVAILABLE`.
- `AllExceptionsFilter` for anything else → `INTERNAL_ERROR`, logged with stack, reported.
- `@ApiErrors(...codes)` decorator documents each route's error codes in OpenAPI.

## 9. Authentication and authorisation

- Evolve `modules/core/auth/` into `admin-auth/` (host: "auth is done, extend it"): keep the RS256 key loading, `JwtStrategy`, `RolesGuard`, `@Roles()`, password utility (bcrypt, already a dependency — reuse per policy).
- Change the JWT extractor from the bearer header to the `avero_admin_at` cookie (bearer allowed only when `BEARER_AUTH_ENABLED`).
- Add session issuance, rotation and revocation (S-18) over `AdminSession`.
- Every admin controller is decorated at class level with the guard and `@Roles(AdminRole.admin)`; a test enumerates all routes and asserts every `/admin/*` route (except login, refresh, logout) has the guard (Q-AZ-01).

## 10. Rate limiting

- Route limits declared with a decorator reading named policies from `common/enums/rate-limits.ts`.
- Backed by the store chosen in OD-01. If OD-01 chooses platform firewall rules, the decorator still documents the limit and the guard becomes a no-op in production, with the same numbers configured in the firewall (kept in sync by a checklist item, Q-SE-06).
- Client IP read from the platform's trusted header only.

## 11. Caching

- `@CacheClass('catalogue' | 'manifest' | 'build' | 'journal')` on routes; `CacheHeadersInterceptor` sets headers and computes ETags via `lib/etag.ts`.
- Default `no-store` for everything else, including all admin and error responses.
- No server-side cache in V1 beyond the per-instance snapshot memo in S-03 (keyed by `rulesVersion`).

## 12. Storage and CDN

- `media/blob.service.ts` wraps the object-storage SDK: server put (I-04), client-upload token (I-03), head/fetch for verification.
- Path conventions: `<model>/<version>/<file>` for 3D; `env/<name>` for environments; `journal/<yyyy>/<mm>/<random>/` for images.
- Upload options set cache-control and content type explicitly (I-05).

## 13. Jobs and cron

`vercel.json` in `apps/api`:

```json
{
  "crons": [
    { "path": "/api/v1/internal/cron/enquiry-retention", "schedule": "0 3 * * *" },
    { "path": "/api/v1/internal/cron/publish-articles", "schedule": "*/15 * * * *" }
  ]
}
```

The cron frequency must be supported by the project's plan; if it is not, publishing falls back to query-time visibility (A-07) and revalidation on the next admin write. `jobs/cron.controller.ts` is excluded from Swagger and guarded by `CronSecretGuard`.

## 14. Contract generation

Unchanged pipeline: `pnpm contract:generate` → compiled `dist/` → `openapi.emit.js` → `packages/contract/openapi.json` → generated types. Additions:

- Export `OPTION_CODES`, `CATEGORY_CODES` (from the seed source of truth) and `ERROR_CODES` from `@avero/contract` (I-01, I-14).
- CI job: regenerate, `git diff --exit-code` on the contract, and run an OpenAPI breaking-change diff against the base branch.
- Replace the current contract exports (`User`, `AuthResponse`, `Period*`) per OD-06.

## 15. Logging, monitoring, error tracking

- Nest `Logger` with a JSON formatter in staging and production; pretty in local.
- A logging interceptor writes one line per request with the I-13 fields.
- Error-tracking SDK initialised in `main.ts` when `SENTRY_DSN` is set; `AllExceptionsFilter` reports.
- Uptime monitor on E-08 every 5 minutes (staging and production).

## 16. Environments and deployment

| Env | API | Database | Storage | Notes |
| --- | --- | --- | --- | --- |
| local | `pnpm dev` | Docker Postgres (existing `setup.sh`) | Blob dev store or a local stub behind the blob service | Cookies without domain |
| staging | Vercel preview on a staging branch, `api.staging.avero.example` | Marketplace Postgres branch | Separate Blob store | Seeded demo data |
| production | Vercel production, `api.avero.example` | Marketplace Postgres, pooled + direct | Production Blob store | Crons on, monitoring on |

**Deploy step:** build → `prisma migrate deploy` (direct URL) → promote. Migrations are backward-compatible with the previous deploy (two-step destructive changes, Phase 3 §12).

**Function settings:** default max duration 10 s; 60 s for E-34 and E-37.

## 17. Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Files | kebab-case, role suffix | `admin-enquiries.controller.ts` |
| DTOs | `<Action><Entity>Dto`, response `<Entity>ResponseDto` | `CreateArticleDto`, `BuildResponseDto` |
| Enums (TS + Prisma) | PascalCase type, snake/lower values matching the contract | `EnquiryStatus.test_drive` |
| Error codes | UPPER_SNAKE | `CONFIGURATION_INVALID` |
| Routes | plural nouns, kebab-case | `/admin/builds/popular-options` |
| Catalogue codes | lowercase kebab | `wheel-21-carbon` |

## 18. Performance strategy

- Catalogue and journal reads: CDN-cacheable headers first; ETag revalidation.
- E-09: one snapshot load (≤ 4 queries) + pure engine (< 1 ms); memo per `rulesVersion` in a warm instance.
- Prisma client created once per instance; lazy connect (existing).
- Avoid N+1 with `include`/`select` shaped to the response DTO.
- Load test before launch (roadmap Phase 3): E-03 and E-09 at 50 rps for 5 minutes, p95 within the [SLOs](phase-1-service-vision.md#8-success-metrics-slos-and-north-star).

## 19. Security hardening

- Helmet (existing); HSTS on production; `noindex` header on `/docs` in production.
- CORS exact origins; credentials only for frontend domains.
- Secrets only in env; `.env.example` lists names without values (existing practice).
- Bcrypt cost ≥ 12 (reuse existing utility).
- Constant-time compares for cron and revalidation secrets.
- Request body size limit 1 MB globally, 5 MB on E-26.
- Swagger UI disabled or protected in production if the maintainer prefers (the document stays public for type generation).

## 20. Dependencies to propose

Per the Library Selection Policy: reuse first, then the spec's suggestion, otherwise recommend — and **confirm before installing**. None is installed by this OS.

| Need | Reuse / spec suggestion | Status |
| --- | --- | --- |
| Password hashing | bcrypt (already installed) | Reuse |
| JWT | `@nestjs/jwt`, `passport-jwt` (installed) | Reuse |
| Validation | class-validator (installed) | Reuse |
| Cookie parsing | none installed | Propose at roadmap Sprint 2 |
| Rate limiting | spec suggests `@nestjs/throttler`; store per OD-01 | Propose with OD-01 |
| Object storage SDK | spec: Vercel Blob | Propose at Sprint 6 |
| Image processing | only if OD-02 = upload-time variants | Propose with OD-02 |
| GLB metadata | spec suggests gltf-transform; S-17 needs none for variant names | Propose only if deeper checks are wanted |
| Error tracking | spec suggests Sentry | Propose at Sprint 8 |
| CAPTCHA, email | optional (OD-03, OD-04) | Propose if enabled |
| OpenAPI diff in CI | none | Propose at Sprint 1 |

## 21. Spec vs code reconciliation

Current code (ported from `nest-setup` on 2026-11-24) against this architecture. Status of each item lives in [Phase 8](phase-8-implementation-roadmap.md).

| # | Code today | Spec / this OS | Change that closes the gap |
| --- | --- | --- | --- |
| R-01 | Error filter emits `{ statusCode, message, error, path, timestamp }` | `{ error: { code, message, details? } }` | Reshape `HttpExceptionFilter`; add `AppException`, error-code enum, `exceptionFactory`, `AllExceptionsFilter` |
| R-02 | Filter catches only `HttpException`; others fall to Nest's default | Every error uses the envelope | `AllExceptionsFilter` |
| R-03 | `POST /auth/login` returns a 7-day bearer JWT | `/admin/auth/login`; 15-min cookie + refresh (A-04) | Move routes under `admin/auth`; cookie extractor; `AdminSession`; `JWT_EXPIRES_IN` → env TTLs |
| R-04 | `POST /auth/register` is public | No visitor accounts (BR-37) | Retire (OD-06); admins come from the seed |
| R-05 | `/users` CRUD and `/users/me` | Not in spec | OD-06: adapt `/users/me` into E-15; retire the rest or move to an admin-users area later |
| R-06 | `/stats/users/*` | Not in spec | OD-06: retire, or adapt `lib/period.ts` for E-20 windows |
| R-07 | `User` table with `role` and `status` enums | `AdminUser` (D-13) | Rename migration (if adapted) or new table |
| R-08 | Old car `Model` table dropped in migration `20261124000000_users` | Catalogue `Model` (D-01) and friends | New migration adding D-01–D-15 |
| R-09 | No rate limiting | BR-18, BR-21, BR-38 | §10 after OD-01 |
| R-10 | Swagger configured with bearer auth | Cookie auth | Add cookie auth scheme; keep bearer for tooling |
| R-11 | Seed upserts `admin@example.com` / `password123` | Credentials from env | `SEED_ADMIN_*` env; refuse to seed defaults when `APP_ENV=production` |
| R-12 | Contract exports `User`, `AuthResponse`, `Period*` | Catalogue, build, enquiry, article, manifest types | Regenerate after the new DTOs |
| R-13 | No cron, blob, revalidation, cookie code | I-03–I-08 | Per roadmap |
| R-14 | Success envelope `{ statusCode, message, data, timestamp }` | Spec is silent; examples are payloads | Keep (host convention); documented in Phase 4 §1 |
