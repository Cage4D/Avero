# Setup Checklist — AVERO Backend OS

> v1.0 · generated 2026-11-24
> See also: [START_HERE](START_HERE.md) · [Phase 7 — Architecture](phase-7-backend-architecture.md) · [IMPLEMENTATION_PROMPT](IMPLEMENTATION_PROMPT.md)

Items already done on this repo are ticked. Commands run from the repo root unless stated.

## Table of contents

1. [Read first](#1-read-first)
2. [Machine](#2-machine)
3. [Repository](#3-repository)
4. [Environment variables](#4-environment-variables)
5. [Database](#5-database)
6. [Host conventions](#6-host-conventions)
7. [Dependencies](#7-dependencies)
8. [Contract generation](#8-contract-generation)
9. [Testing](#9-testing)
10. [Platform (staging and production)](#10-platform-staging-and-production)
11. [Verification](#11-verification)

---

## 1. Read first

- [ ] [Phase 1](phase-1-service-vision.md): business rules (§7), assumptions (§14), open decisions (§15)
- [ ] [Phase 3](phase-3-domain-model.md): entities and the reference schema
- [ ] [Phase 4](phase-4-api-surface.md): conventions and error catalogue
- [ ] [Phase 7](phase-7-backend-architecture.md): folders, pipeline, env, reconciliation

## 2. Machine

- [x] Node 24 (pinned in `.nvmrc`: `24.22.3`); `nvm use`
- [x] pnpm 12 (`packageManager` in the root `package.json`)
- [x] Docker running (for local Postgres)
- [ ] Vercel CLI logged in to the team that owns the API project (needed for env and cron checks)

## 3. Repository

- [x] Monorepo: `apps/web`, `apps/api`, `packages/contract`, `packages/config`
- [x] `pnpm install`
- [x] `scripts/setup.sh` run: `.env` files, JWT keys, Docker Postgres, migrations, seed
- [ ] CI workflow created (none exists yet): install → typecheck → lint → test → contract diff (Sprint 1)

## 4. Environment variables

Defined in [Phase 7 §6](phase-7-backend-architecture.md#6-configuration-and-environment). Add each to `apps/api/.env.example` (names only) and to `env.validation.ts` in the sprint that needs it.

| Variable | Local | Staging | Production | Sprint |
| --- | --- | --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | [x] | [ ] | [ ] unverified: prod `DIRECT_URL` still needed | — |
| `CORS_ORIGINS` | [x] | [ ] | [ ] | — |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | [x] | [ ] | [ ] blocked: needs Vercel access | — |
| `APP_ENV` | [ ] | [ ] | [ ] | 0 |
| `COOKIE_DOMAIN`, token TTLs, `BEARER_AUTH_ENABLED` | [ ] | [ ] | [ ] | 2 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | [ ] | [ ] | [ ] | 2 |
| Rate-limit store vars (OD-01) | [ ] | [ ] | [ ] | 3 |
| `CRON_SECRET` | [ ] | [ ] | [ ] | 5 |
| `TURNSTILE_SECRET_KEY`, alert email vars (OD-03/04) | [ ] | [ ] | [ ] | 5 |
| `BLOB_READ_WRITE_TOKEN`, `CDN_HOST` | [ ] | [ ] | [ ] | 6 |
| `REVALIDATE_URL`, `REVALIDATE_SECRET` | [ ] | [ ] | [ ] | 6 |
| `SENTRY_DSN` | — | [ ] | [ ] | 8 |

Generate keys with `pnpm --filter @avero/api keys:generate`. Never commit `.env`.

## 5. Database

- [x] Local Postgres container `avero-postgres` running and seeded
- [x] Runtime uses pooled `DATABASE_URL`; migrations use `DIRECT_URL` (`prisma.config.ts`)
- [ ] Catalogue migration D-01–D-06 + D-14 (Sprint 0)
- [ ] Remaining entities D-07–D-15 (Sprint 1–2)
- [ ] Partial unique index for the live asset version, in raw SQL (Sprint 7)
- [ ] Seed rewritten for the GT catalogue, three articles, env-provided admin (Phase 3 §13)
- [ ] Seed idempotency check in CI (Q-DI-12)
- [ ] Production `db:deploy` — **confirm first**: migration `20261124000000_users` drops the old `Model` table and its data

Commands:

```bash
pnpm db:migrate            # create/apply a migration locally (direct URL)
pnpm db:seed               # idempotent seed
pnpm --filter @avero/api db:deploy   # apply committed migrations (staging/production)
```

## 6. Host conventions

- [x] Read [`apps/api/CLAUDE.md`](../../CLAUDE.md)
- [ ] Every new module follows the `users` module layout (dto/, service, controller, module)
- [ ] Prisma only in `src/common/repos/`; pure logic in `src/lib/`
- [ ] Relative imports with `.js` suffix

## 7. Dependencies

Per the Library Selection Policy: reuse what is installed; otherwise propose with a reason and **wait for approval before installing**. Never hand-edit `package.json`.

| Need | Installed? | Action |
| --- | --- | --- |
| bcrypt, `@nestjs/jwt`, passport-jwt, class-validator, zod, helmet, `@nestjs/swagger` | Yes | Reuse |
| Cookie parsing | No | Propose in Sprint 2 |
| Rate limiting + store | No | Propose with OD-01 (Sprint 3) |
| Object storage SDK | No | Propose in Sprint 6 |
| Image processing | No | Only if OD-02 = upload-time variants |
| Error tracking SDK | No | Propose in Sprint 8 |
| OpenAPI diff for CI | No | Propose in Sprint 1 |
| Load-test tool | No | Propose in Sprint 8 |

After any approved install: `pnpm install` at the root, then rerun the host gate.

## 8. Contract generation

- [x] `pnpm contract:generate` exports OpenAPI from `dist/` into `packages/contract/openapi.json` and generates types
- [ ] Export option, category and error code lists from `@avero/contract` (I-01, I-14)
- [ ] CI: regenerate and `git diff --exit-code`; breaking-change diff against the base branch
- [ ] Frontend consumes the new types (catalogue, build, enquiry, article, manifest)

## 9. Testing

- [x] Jest ESM configured (`--experimental-vm-modules`), unit and e2e in one config
- [x] e2e boots the app with throwaway RSA keys when none are set
- [ ] Test database strategy for integration tests: a separate database on the local container, migrated and seeded per run
- [ ] GLB fixtures in `test/fixtures/` (with variants, without, truncated) for S-17
- [ ] Property-test helper for S-01 (propose a library only if hand-rolled generators are not enough)

Heavy jobs (typecheck, test, build) run one at a time; check machine load first.

## 10. Platform (staging and production)

- [ ] API project domains: `api.avero.example`, `api.staging.avero.example`; frontend on the same parent domain
- [ ] Marketplace Postgres connected; pooled + direct URLs set per environment
- [ ] Blob store per environment; CORS for the frontend domains
- [ ] `apps/api/vercel.json` with both crons (Phase 7 §13); crons visible in the dashboard
- [ ] Function max duration 60 s for asset registration and retention
- [ ] Uptime monitor on `/api/v1/health`
- [ ] Error tracking project and alerts (I-13)

## 11. Verification

Run after setup and after each sprint:

- [ ] `pnpm --filter @avero/api typecheck`
- [ ] `pnpm --filter @avero/api lint`
- [ ] `pnpm --filter @avero/api test`
- [ ] `pnpm contract:generate` produces no unexpected diff
- [ ] `GET /api/v1/health` answers `ok` locally
- [ ] Swagger at `/api/v1/docs` lists every new route with its error codes
- [ ] Phase 8 status register updated; matching Phase 9 items ticked
