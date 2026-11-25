# Phase 8 — Implementation Roadmap

> AVERO Backend OS · v1.0 · generated 2026-11-24 · status checked against the codebase on 2026-11-24
> Previous: [Phase 7 — Backend Architecture](phase-7-backend-architecture.md) · Next: [Phase 9 — QA Checklist](phase-9-qa-checklist.md)

This phase is the only home for **status**. It aligns with the four milestones in the spec. Dates are the spec's proposals, still to be agreed by both owners.

## Table of contents

1. [Timeline](#1-timeline)
2. [Sprint plan](#2-sprint-plan)
3. [Dependencies](#3-dependencies)
4. [Build status vocabulary](#4-build-status-vocabulary)
5. [Status register](#5-status-register)
6. [Unspecified in code](#unspecified-in-code)
7. [Risks](#7-risks)
8. [Technical debt prevention](#8-technical-debt-prevention)
9. [Testing strategy](#9-testing-strategy)
10. [Deployment readiness](#10-deployment-readiness)

---

## 1. Timeline

18 weeks, 9 two-week sprints.

| Spec milestone | Dates | Sprints |
| --- | --- | --- |
| Phase 0 · Spike | Nov 23 – Dec 6, 2026 | Sprint 0 |
| Phase 1 · Define | Dec 7, 2026 – Jan 3, 2027 | Sprints 1–2 |
| Phase 2 · Build | Jan 4 – Feb 28, 2027 | Sprints 3–6 |
| Phase 3 · Launch | Mar 1 – Mar 28, 2027 | Sprints 7–8 |

## 2. Sprint plan

### Sprint 0 · Nov 23 – Dec 6 (Spike)

Goal: `GET /models/:code` returns the GT from seeded data; types generated on the frontend.

- Catalogue tables D-01–D-06 + D-14 migration; seed the GT catalogue (Phase 3 §13).
- E-02 (minimal) through S-04.
- Draft option-code list exported to the contract (I-14).
- Error envelope R-01, R-02 (cheap now, expensive later).
- Spec milestones: monorepo/Nest/Postgres/Prisma ✅ already; data model draft = this OS; OpenAPI + types ✅ pipeline exists.

### Sprint 1 · Dec 7 – Dec 20 (Define)

- Data contract sign-off with Cage on Phase 4 shapes (governance).
- Full schema D-01–D-15, migrations, complete seed.
- E-01, E-02, E-03 with S-03, S-23 caching.
- CI: typecheck, lint, test, contract diff (I-01).
- Resolve OD-06 (fate of `/auth/register`, `/users`, `/stats`).

### Sprint 2 · Dec 21 – Jan 3 (Define)

- Admin auth E-12–E-15, S-18, I-02, D-13, D-15 (R-03–R-07, R-10, R-11).
- `OriginGuard`, cookie parsing (dependency approval).
- E-08 health completed (database check, version).

### Sprint 3 · Jan 4 – Jan 17 (Build)

- Rules engine S-01, pricing S-02 with the full unit suite (Q-RE-xx).
- E-09.
- Resolve OD-01 (rate-limit store) and set it up (S-19, I-09).

### Sprint 4 · Jan 18 – Jan 31 (Build)

- AVERO Codes: S-06, S-07, E-10, E-05, D-07.
- Rate limits on E-09, E-10.

### Sprint 5 · Feb 1 – Feb 14 (Build)

- Enquiries: S-08, S-20, E-11, D-08, D-09; OD-03, OD-04 decided.
- Retention: S-10, E-37, I-06, `vercel.json` crons.

### Sprint 6 · Feb 15 – Feb 28 (Build)

- Journal: S-11, S-12, E-06, E-07, E-21–E-25, D-10.
- Media: S-13, E-26, I-04 (OD-02 decided; Blob dependency approved).
- Revalidation: S-14, I-08, E-38, I-07.
- Seed the three launch articles.

### Sprint 7 · Mar 1 – Mar 14 (Launch)

- Assets: S-15, S-16, S-17, E-04, E-33–E-36, D-11, D-12, I-03, I-05; OD-05 decided.
- Admin endpoints for leads and builds: S-09, S-21, E-16–E-20.
- Admin catalogue: S-05, E-27–E-32.

### Sprint 8 · Mar 15 – Mar 28 (Launch)

- Staging and production deployed (Phase 7 §16), crons and monitoring on (I-13).
- Load test public endpoints (Phase 7 §18).
- Full [Phase 9](phase-9-qa-checklist.md) pass; restore drill.

> Sprint 7 is the heaviest. If it slips, move admin catalogue CRUD (E-27–E-32) to Sprint 8 and edit prices through the seed until then; the public surface does not depend on it.

## 3. Dependencies

```
D-01..D-06 ─► S-03 ─► S-01/S-02 ─► E-09 ─► S-07 (E-10/E-05) ─► S-08 (buildCode) 
          └─► E-01..E-03                                     └─► S-21 (E-20)
D-13/D-15 ─► S-18 ─► every admin endpoint (E-16..E-36)
OD-01 ─► S-19 ─► E-10, E-11, E-12 limits
Blob approval ─► S-13 (E-26) ─► S-16 (E-33..E-36)
S-05 + live asset ─► variant warnings (F-15 coupling)
I-01 CI ─► contract sign-off ─► frontend integration
```

## 4. Build status vocabulary

| Status | Meaning |
| --- | --- |
| **Specified** | Defined in the blueprints, not yet scheduled |
| **Scheduled** | Assigned to an agreed sprint |
| **In progress** | Implementation started |
| **Built** | Implemented and merged |
| **Verified** | Implemented and passing the Phase 9 checks |
| **Deferred** | Deliberately postponed; carries a reason and a revisit trigger |

The sprint plan above is a **proposal**. Items move from Specified to Scheduled when both owners agree the plan.

## 5. Status register

Status determined from the code on 2026-11-24.

### Flows

| ID | Flow | Status | Sprint | Evidence |
| --- | --- | --- | --- | --- |
| F-01 | Browse the lineup | Specified | 1 | — |
| F-02 | View a model | Specified | 0 | — |
| F-03 | Load configurator data | Specified | 1 | — |
| F-04 | Validate and price | Specified | 3 | — |
| F-05 | Save a build | Specified | 4 | — |
| F-06 | Restore a build | Specified | 4 | — |
| F-07 | Asset manifest | Specified | 7 | — |
| F-08 | Submit an enquiry | Specified | 5 | — |
| F-09 | Read the journal | Specified | 6 | — |
| F-10 | Admin session | In progress | 2 | Bearer JWT login, bcrypt, RS256 keys, guards exist; no cookies, refresh or sessions |
| F-11 | Manage leads | Specified | 7 | — |
| F-12 | Builds and popular options | Specified | 7 | — |
| F-13 | Author and publish | Specified | 6 | — |
| F-14 | Edit the catalogue | Specified | 7 | — |
| F-15 | Ship a 3D asset version | Specified | 7 | — |
| F-16 | Enquiry retention | Specified | 5 | — |
| F-17 | Scheduled publishing | Specified | 6 | — |
| F-18 | Health check | In progress | 2 | Returns `{ status: 'ok' }`; no database check or version |
| F-19 | Contract publication | In progress | 1 | Export + type generation work; no CI diff |

### Entities

| ID | Entity | Status | Evidence |
| --- | --- | --- | --- |
| D-01–D-06 | Catalogue | Specified | Old placeholder `Model` table dropped |
| D-07 | Build | Specified | |
| D-08, D-09 | Enquiry, EnquiryNote | Specified | |
| D-10 | Article | Specified | |
| D-11, D-12 | AssetVersion, AssetFile | Specified | |
| D-13 | AdminUser | In progress | `User` table with role and status covers part of it (R-07) |
| D-14 | CatalogueRevision | Specified | |
| D-15 | AdminSession | Specified | |

### Endpoints

| ID | Endpoint | Status | Sprint |
| --- | --- | --- | --- |
| E-01–E-03 | Catalogue reads | Specified | 0–1 |
| E-04 | Asset manifest | Specified | 7 |
| E-05 | Build by code | Specified | 4 |
| E-06, E-07 | Journal reads | Specified | 6 |
| E-08 | Health | In progress | 2 |
| E-09 | Validate | Specified | 3 |
| E-10 | Save build | Specified | 4 |
| E-11 | Enquiry | Specified | 5 |
| E-12 | Admin login | In progress (exists as `/auth/login`) | 2 |
| E-13–E-15 | Logout, refresh, me | Specified (`/users/me` is a partial basis for E-15) | 2 |
| E-16–E-20 | Admin leads and builds | Specified | 7 |
| E-21–E-25 | Admin articles | Specified | 6 |
| E-26 | Media upload | Specified | 6 |
| E-27–E-32 | Admin catalogue | Specified | 7 |
| E-33–E-36 | Admin assets | Specified | 7 |
| E-37, E-38 | Cron | Specified | 5, 6 |
| E-39 | Docs | **Built** | — |

### Services

| ID | Service | Status | Sprint |
| --- | --- | --- | --- |
| S-01, S-02 | Rules engine, pricing | Specified | 3 |
| S-03, S-04 | Snapshot, catalogue read | Specified | 0–1 |
| S-05 | Catalogue admin | Specified | 7 |
| S-06, S-07 | Code generator, builds | Specified | 4 |
| S-08, S-20 | Intake, spam guard | Specified | 5 |
| S-09, S-21 | Leads, analytics | Specified | 7 |
| S-10 | Retention | Specified | 5 |
| S-11–S-14 | Journal, media, revalidation | Specified | 6 |
| S-15–S-17 | Assets | Specified | 7 |
| S-18 | Admin auth | In progress | 2 |
| S-19 | Rate limiting | Specified | 3 |
| S-22 | Health | In progress | 2 |
| S-23 | HTTP caching | Specified | 1 |

### Integration contracts

| ID | Contract | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | OpenAPI contract | In progress | Generation works; CI diff and shared code lists missing |
| I-02 | Admin cookies | Specified | |
| I-03–I-05 | Storage and CDN | Specified | |
| I-06, I-07 | Cron | Specified | No `vercel.json` in the API app |
| I-08 | Revalidation | Specified | |
| I-09 | Rate-limit store | Specified | Blocked on OD-01 |
| I-10, I-11 | CAPTCHA, email | Specified | Optional; OD-03, OD-04 |
| I-12 | Postgres | **Built** | Pooled `DATABASE_URL` at runtime, `DIRECT_URL` for migrations, lazy connect |
| I-13 | Logs and error tracking | Specified | Nest `Logger` only |
| I-14 | Blender export contract | Specified | Needs Cage's agreement |

### Architecture items (Phase 7)

| Item | Status |
| --- | --- |
| Helmet, CORS from env, global `ValidationPipe` with whitelist and forbid | **Built** |
| Success envelope interceptor | **Built** |
| Error envelope (R-01, R-02) | Specified · Sprint 0 |
| Env validation (zod) | **Built**; new variables Specified |
| Layering, repos, RS256 key loading | **Built** |

## Unspecified in code

Code that matches no artifact in this OS. Recommendation only; the maintainer decides (OD-06).

| Code | What it does | Recommendation |
| --- | --- | --- |
| `POST /auth/register` | Public self-registration | **Retire.** Conflicts with BR-37 (no visitor accounts) and opens an unauthenticated write. |
| `POST /auth/login` | Bearer-token login | **Adapt** into E-12 (R-03). |
| `GET /users/me` | Current user | **Adapt** into E-15. |
| `POST/GET/PATCH/DELETE /users` | User CRUD | **Retire** for V1, or **adapt** into a future admin-users area (not in spec). |
| `GET /stats/users/total`, `/stats/users/series` | User counts by period | **Retire**; keep `lib/period.ts` if E-20 uses it for windows. |
| `User` model, `UserRole`, `UserAccountStatus` | User accounts | **Adapt** into D-13 `AdminUser` (R-07). |
| Contract exports `User`, `AuthResponse`, `Period*` | Types for the above | Follow the decisions above. |
| `apps/web` lab page fetching `/health` | Pipeline demo | Keep; frontend-owned. |

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Rules engine edge cases ship wrong prices | Medium | High | Pure function, worked examples as tests, property tests (Q-RE-xx) |
| Blender variant names drift from option codes | High | High | I-14 contract, S-16 check, shared code list |
| Serverless cold starts exceed latency SLOs | Medium | Medium | Small dependency graph, lazy Prisma, cacheable reads |
| Connection exhaustion | Low | High | Pooled URL (built), short transactions |
| Rate-limit store adds cost or latency | Low | Low | OD-01: firewall rules alternative |
| Cron frequency not on plan | Medium | Low | A-07 query-time visibility |
| Sprint 7 overload | High | Medium | Fallback noted in Sprint 7 |
| Cookie cross-domain issues | Medium | Medium | Same parent domain; test in staging early (Sprint 2) |
| Contract changes break the frontend | Medium | High | CI diff, PR review by the other owner |

## 8. Technical debt prevention

- Every new route ships with DTOs, `@ApiEnvelope`, `@ApiErrors`, a rate/caching decision and an e2e test.
- No raw SQL outside the documented exception (Phase 7 §7).
- Every rule change to S-01 adds a worked example test first.
- Host gate before every merge: typecheck, lint, test (host conventions).

## 9. Testing strategy

| Layer | Scope | Tooling (existing) |
| --- | --- | --- |
| Unit | `lib/` pure functions (S-01, S-02, S-06, S-09 table, S-17, S-23, tiptap) — 100% branch on S-01/S-02 | Jest ESM |
| Service | Services with mocked repos and integration clients | Jest |
| Integration | Every endpoint against a disposable Postgres (Docker, existing) with the seed | Jest + Supertest |
| Contract | Regenerate and diff OpenAPI in CI | `contract:generate` + diff tool |
| Load | E-03, E-09 at 50 rps | Tool to propose (Sprint 8) |

## 10. Deployment readiness

Before production (Sprint 8):

- [ ] All Phase 9 items pass, or are Deferred with a reason.
- [ ] Production env variables set on the API project, including JWT keys (currently pending: needs Vercel access).
- [ ] `prisma migrate deploy` run against the production `DIRECT_URL` (currently pending: needs the URL; note that migration `20261124000000_users` drops the old `Model` table).
- [ ] Crons visible in the platform dashboard; first runs succeeded.
- [ ] Blob CORS and content types verified (I-05).
- [ ] Uptime monitor and error tracking receiving events.
- [ ] Restore drill done.
