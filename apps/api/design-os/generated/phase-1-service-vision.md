# Phase 1 — Service Vision

> AVERO Backend OS · v1.0 · generated 2026-11-24 · source: [AVERO — Backend Spec](../../docs/AVERO%20%E2%80%94%20Backend%20Spec.md) (Nov 22, 2026, Cage4D)
> Next: [Phase 2 — Flow Maps](phase-2-flow-maps.md)

This is the single source of truth for **why** the AVERO backend exists, **who** it serves, and the **business rules** (`BR-xx`) that every later phase cites.

## Table of contents

1. [Business vision](#1-business-vision)
2. [Service purpose](#2-service-purpose)
3. [Ownership boundary](#3-ownership-boundary)
4. [Business goals](#4-business-goals)
5. [Consumers and actors](#5-consumers-and-actors)
6. [Value proposition and jobs to be done](#6-value-proposition-and-jobs-to-be-done)
7. [Business rules](#7-business-rules)
8. [Success metrics, SLOs and North Star](#8-success-metrics-slos-and-north-star)
9. [Governance](#9-governance)
10. [Platform constraints](#10-platform-constraints)
11. [Service principles](#11-service-principles)
12. [Implementation philosophy](#12-implementation-philosophy)
13. [Agreed decisions](#13-agreed-decisions)
14. [Assumptions](#14-assumptions)
15. [Open decisions](#15-open-decisions)
16. [Non-goals](#16-non-goals)
17. [Future scalability](#17-future-scalability)

---

## 1. Business vision

AVERO is a fictional premium car brand, built as a portfolio project by Cage4D and the backend developer. Visitors explore the lineup, configure a GT in 3D, save and share that configuration as an **AVERO Code**, read the journal, and send an enquiry or request a test drive. Staff manage those leads, the catalogue, the journal and the 3D assets from an admin area.

The backend is the part that has to be right. It holds the rules that decide which car can be built and what it costs, the immutable record of every saved build, and the versioned 3D files the viewer loads. These are the same problems real manufacturer configurators solve.

## 2. Service purpose

The backend **stores, decides and serves**:

| Verb | What |
| --- | --- |
| Stores | Catalogue (models, trims, option categories, options, prices, specs, rules), saved builds, enquiries, journal articles and media, 3D asset versions, admin users |
| Decides | Whether a configuration is valid, what it costs, which options are included, which conflicts exist and how to fix them, whether a saved build is outdated, whether an enquiry is spam, whether an uploaded GLB matches the catalogue |
| Serves | The catalogue and configurator data, validation results, builds by code, asset manifests by device tier, published articles, the admin APIs, and the OpenAPI contract |

## 3. Ownership boundary

| Owned by the backend | Not owned by the backend | Co-owned |
| --- | --- | --- |
| Vehicle catalogue and specs | Page rendering, animation | The data contract (OpenAPI → `@avero/contract`) |
| Configuration rules engine and pricing | The 3D viewer and configurator UI | The shared option-code list (DB codes = Blender variant names) |
| Saved builds (AVERO Codes) | Blender models and material setup | |
| Enquiry and test-drive intake | Visitor accounts (none in V1) | |
| Journal articles and media | | |
| 3D asset storage, versioning, manifests, variant check | | |
| Database, admin auth, environments, deploy, monitoring | | |
| The admin dashboard's **APIs** and, per the agreed decision, the dashboard build itself | | |

The admin dashboard is a Next.js route group (`/admin`) that the backend developer builds. This backend OS specifies the capabilities and contracts the dashboard consumes; its presentation belongs to the frontend design OS.

## 4. Business goals

| ID | Goal |
| --- | --- |
| G-01 | A visitor can configure a GT and always see a correct price and a clear reason when a combination is not allowed. |
| G-02 | Any configuration can be saved as a short code and reopened, unchanged, months later. |
| G-03 | Test-drive requests arrive with the exact configured car attached. |
| G-04 | Staff can change prices, option names, rules, articles and the live 3D model without a deploy. |
| G-05 | The Blender-to-web pipeline cannot ship a model whose variants do not match the catalogue. |
| G-06 | The system runs on Vercel at near-zero operating cost and stays fast on public reads. |
| G-07 | The codebase is a credible portfolio piece: tested rules engine, typed contract, clean layering. |

## 5. Consumers and actors

| ID | Consumer | Actor | Channel | Trust level |
| --- | --- | --- | --- | --- |
| C-01 | Visitor browser | Anonymous visitor | Public API calls from the frontend's browser code | Untrusted. Every input validated, every number recomputed. |
| C-02 | Frontend server | None (machine) | Next.js server components and route handlers fetching public routes | Untrusted for writes; same public surface as C-01. |
| C-03 | Admin dashboard | Admin | The `/admin` area of the frontend, same parent domain, cookie session | Authenticated, role-checked per route. |
| C-04 | Scheduled jobs | None (machine) | Vercel Cron → protected internal endpoints | Trusted only with the cron secret. |
| C-05 | Asset author | Cage (3D) via an admin | Uploads GLBs through C-03 | Authenticated as admin; the uploaded file itself is untrusted until checked. |
| C-06 | CDN client | Visitor browser | Direct GLB, KTX2, HDR and image downloads from the CDN | No API involvement; served from immutable URLs the API hands out. |
| C-07 | Contract consumer | Frontend developer | `@avero/contract` generated from the OpenAPI document | Build-time; breaking changes must be caught in CI. |

## 6. Value proposition and jobs to be done

| Consumer | Value | Jobs to be done |
| --- | --- | --- |
| C-01 Visitor | Instant, trustworthy answers about what can be built and what it costs | "Show me everything I can configure in one call." "Tell me if this combination works, and if not, how to fix it." "Save my car and give me a code I can share." "Let me ask for a test drive of *this* car." |
| C-02 Frontend server | Cacheable, stable reads | "Render the lineup, a model page and an article fast, and refresh when content changes." |
| C-03 Admin | Run the brand without a deploy | "See new leads and move them through the pipeline." "Change a price or a rule safely." "Publish or schedule an article." "Ship a new 3D model version and roll it back if it breaks." |
| C-04 Jobs | Hands-off hygiene | "Delete enquiries older than 90 days." "Make scheduled articles go live." |
| C-05 Asset author | Early failure | "Tell me at upload time if my variant names do not match the option codes." |
| C-07 Contract consumer | Types that cannot drift | "Generate my types from the API and fail CI if the API breaks me." |

## 7. Business rules

Every rule traces to a section of the spec. Rules marked *(A)* come from an assumption in §14.

### Catalogue and money

| ID | Rule | Source |
| --- | --- | --- |
| BR-01 | Money is stored and transmitted as integers in EUR minor units (cents). EUR is the only currency in V1. | Data model; Decisions |
| BR-02 | A model has trims; a trim offers options, each in exactly one category (paint, wheels, interior, package). | Data model |
| BR-03 | An option's `code` is its stable ID and equals the glTF material-variant name exported from Blender (e.g. `paint-obsidian-black`). | Data model |
| BR-04 | An option's price is set per trim and may differ between trims. | Data model (`TrimOption`) |
| BR-05 | A model is either `live` or `teaser`. Teasers (RS, X) appear in the lineup but are not configurable. *(A-02)* | Data model |
| BR-06 | Staff can edit prices, option names and rules without a deploy. | Admin dashboard |

### Configuration rules and pricing

| ID | Rule | Source |
| --- | --- | --- |
| BR-07 | The server is the source of truth for validity and price. A client may predict, but never supplies a price or total the server trusts. | Rules; Validation |
| BR-08 | Rule types: `requires` (A needs B), `excludes` (A and B cannot coexist), `includes` (A adds B at no extra cost), `default` (chosen when nothing else is), `single` (category: exactly one). | Rules table |
| BR-09 | Paint and wheels are single-select and required. For a single-select category a new choice replaces the old one. | Data model; Rules step 2 |
| BR-10 | Validation order: start from the trim's defaults → apply the visitor's selections (replacing within single categories) → apply `includes` → check `requires` and `excludes` → return valid or a list of conflicts. | Rules steps 1–4 |
| BR-11 | Every conflict carries its type, the options involved, a human message and a suggested fix (e.g. options to add). | Rules step 4 |
| BR-12 | Price = trim base price + the sum of chosen option prices; included options cost zero. | Rules step 5 |
| BR-13 | Every validation result carries the `rulesVersion` it was computed under. The version increments whenever a price, an option's availability or a rule changes. *(A-03)* | Response shape; Saved builds |

### Saved builds

| ID | Rule | Source |
| --- | --- | --- |
| BR-14 | An AVERO Code is `AV-` + 8 characters from an alphabet without lookalikes (no `0`, `O`, `1`, `I`, `L`), generated randomly and retried on collision, never derived from a sequential ID. | Saved builds |
| BR-15 | Only a configuration that passes validation can be saved. | Saved builds |
| BR-16 | A saved build snapshots `totalPrice` and `rulesVersion`. It always reopens with its original price, flagged `outdated` when the current rules version differs. | Saved builds |
| BR-17 | A build is never edited. A change creates a new code. | Saved builds |
| BR-18 | Saving is rate-limited per IP (20 per hour). | Saved builds; Security |
| BR-19 | An enquiry may reference a build by code. | Saved builds |

### Enquiries

| ID | Rule | Source |
| --- | --- | --- |
| BR-20 | Enquiry types: `general`, `vehicle`, `test_drive`. Required: type, name, email, message, consent. Optional: phone, build code, preferred date, preferred showroom (from a fixed list of fictional showrooms). Unknown fields are rejected. | Enquiry rules |
| BR-21 | Spam protection: a honeypot field, IP rate limiting, and optional Cloudflare Turnstile. | Enquiry rules |
| BR-22 | Status flow: `new` → `contacted` → `scheduled` (test drives only) → `closed`. | Enquiry rules |
| BR-23 | Enquiries are deleted 90 days after creation by a daily job. | Enquiry rules |
| BR-24 | AVERO is fictional: nobody is contacted automatically; only optional admin alerts are sent. | Enquiries intro |
| BR-25 | Only the personal data an enquiry needs is stored. | Security |

### Journal

| ID | Rule | Source |
| --- | --- | --- |
| BR-26 | Article categories: `design`, `engineering`, `announcements`. Status: `draft`, `scheduled`, `published`. | Journal |
| BR-27 | The body is structured rich-text JSON (TipTap/ProseMirror), never MDX or executable code. | Journal; Decisions |
| BR-28 | Drafts are never returned by public routes; scheduled articles become public at `publishedAt`. | Journal |
| BR-29 | Every article exposes `metaTitle`, `metaDescription`, `ogImageUrl`. | Journal |
| BR-30 | Publishing (including a scheduled article going live) triggers the frontend revalidation webhook. | Journal |
| BR-31 | Journal images are served from the CDN with width variants. | Journal |

### 3D assets

| ID | Rule | Source |
| --- | --- | --- |
| BR-32 | Asset files live at immutable, versioned URLs. Switching versions changes the manifest, never the files. | 3D asset delivery |
| BR-33 | Every option code offered for a model must have a matching `KHR_materials_variants` name in that model's GLB. A mismatch rejects or flags the version. | 3D asset delivery |
| BR-34 | Size budgets: desktop 15 MB, mobile 6 MB. Exceeding them warns; it does not block. | 3D asset delivery |
| BR-35 | The previous asset version stays switchable (rollback). | 3D asset delivery |
| BR-36 | GLB files never pass through the API; they upload from the browser straight to object storage with a scoped token. | Hosting; 3D asset delivery |

### Access and operations

| ID | Rule | Source |
| --- | --- | --- |
| BR-37 | V1 has no visitor accounts. Only admins sign in. | Scope |
| BR-38 | Admin passwords are hashed (argon2 or bcrypt). Login is rate-limited. | Security |
| BR-39 | Public writes are limited to saving builds and submitting enquiries; everything else that writes needs an admin session. | Architecture |
| BR-40 | The API is stateless and versioned under `/api/v1`. | Stack |
| BR-41 | Every body, query and param is validated against a schema; unknown fields are rejected. | Validation |
| BR-42 | Prisma migrations are committed and reviewed; the production schema is never edited by hand. | Conventions |

## 8. Success metrics, SLOs and North Star

**North Star:** *saved builds per week that are reopened or attached to an enquiry.* It captures the core loop: configure → save → share or act.

| Metric | Target |
| --- | --- |
| Rules engine unit coverage | 100% of rule types and the combinations in [Phase 5 S-01](phase-5-service-blueprints.md#s-01-rules-engine) |
| Price correctness | 0 builds whose stored total differs from the engine's total at save time |
| Variant check | 0 live asset versions with an unmatched option code |
| Contract drift | 0 merged breaking changes not flagged in CI |

| SLO | Target (monthly) |
| --- | --- |
| Availability, public reads | 99.5% |
| p95 latency, cached catalogue reads | < 150 ms at the edge |
| p95 latency, `POST /configurator/validate` | < 300 ms warm, < 1.5 s cold start |
| p95 latency, `POST /builds`, `POST /enquiries` | < 500 ms warm |
| 5xx error rate | < 0.5% of requests |

## 9. Governance

| Change | Approver |
| --- | --- |
| Data contract (any request or response shape in [Phase 4](phase-4-api-surface.md)) | Both owners; PR review by the other person (spec: Conventions) |
| Prisma schema and migrations | Backend owner; reviewed PR; never edited in production by hand |
| Rules and prices (data) | Admins, through the catalogue admin; every change bumps `rulesVersion` |
| Option codes | Both owners: they are shared with Blender |
| Dependencies | Maintainer approval before install (Library Selection Policy) |

## 10. Platform constraints

| Constraint | Consequence |
| --- | --- |
| NestJS runs as a single Vercel Function | Cold starts; no long-lived process; no in-memory state between requests |
| 4.5 MB request body limit | GLBs upload client-side to Vercel Blob; journal images may pass through the API |
| No background process | Scheduled work runs as Vercel Cron calling protected endpoints |
| Serverless connection fan-out | Prisma uses the **pooled** URL at runtime, the **direct** URL for migrations |
| Stateless | Rate-limit counters need an external store (Upstash Redis) or Vercel Firewall rules |
| Separate Vercel projects for web and API | Same parent domain (`avero.example`, `api.avero.example`) so admin cookies work across both |

## 11. Service principles

1. **The server decides.** Validity, price, inclusion and outdatedness are computed server-side, every time.
2. **Snapshots are sacred.** A saved build is never rewritten; history is preserved by creating, not editing.
3. **Fail loudly at the boundary.** Unknown fields, malformed payloads and mismatched variants are rejected with a precise error, not coerced.
4. **Collect little, keep it briefly.** Enquiry data is minimal and deleted on schedule.
5. **Reads are cheap.** Catalogue reads are almost static and cached by HTTP headers before anything else.
6. **One contract.** The OpenAPI document is the only description of shapes the frontend trusts.

## 12. Implementation philosophy

- Rule-bearing logic is a pure function with no I/O ([S-01](phase-5-service-blueprints.md#s-01-rules-engine), [S-02](phase-5-service-blueprints.md#s-02-pricing)), so it is cheap to test exhaustively.
- Follow the host conventions (reconciled in [Phase 7](phase-7-backend-architecture.md)): one job per unit, one-way layering from transport to data.
- Prefer platform primitives (Vercel Cron, Blob, Firewall) to running infrastructure.
- Add infrastructure (Redis, email, CAPTCHA) only where a rule demands it.

## 13. Agreed decisions

Copied from the spec, agreed **Nov 22, 2026**.

| Question | Decision |
| --- | --- |
| Stack | NestJS, PostgreSQL, Prisma |
| Hosting | Vercel for the API, Marketplace Postgres (Neon or Prisma Postgres), Vercel Blob for files |
| Journal body | Rich-text JSON (TipTap), not MDX |
| Admin dashboard | Next.js `/admin`, built by the backend developer with shadcn/ui on the brand tokens |
| Currency | EUR |
| Credits | Footer and README credits (frontend concern; recorded for completeness) |

## 14. Assumptions

| ID | Assumption | Why | Cited by |
| --- | --- | --- | --- |
| A-01 | One admin role (`admin`) in V1. The `role` field exists so an `editor` role can be added later. | The spec lists `role` on `AdminUser` but no roles. | D-13, E-12 |
| A-02 | Teaser models return from `GET /models` and `GET /models/:code`, but `/configurator`, `/assets`, validation and saving answer `MODEL_NOT_CONFIGURABLE`. | Teasers have no trims to configure. | BR-05, E-03 |
| A-03 | `rulesVersion` is one global integer for the whole catalogue, incremented in the same transaction as any price, availability or rule change. A build is `outdated` when its `rulesVersion` differs from the current one. | The spec shows a single integer and does not scope it. A global counter is simple and correct; per-trim versions are a later optimisation. | BR-13, BR-16, D-14 |
| A-04 | Admin auth uses a short-lived access JWT (15 min) plus a rotating refresh token, both in httpOnly, Secure, SameSite=Lax cookies on the parent domain. Refresh tokens are stored hashed so logout revokes them. | The spec allows "session cookie or short-lived JWT with refresh". This reuses the RS256 JWT setup already in the code and still makes logout real. | I-02, E-12–E-15 |
| A-05 | Enquiry notes are separate append-only records, not a single text field. | "Add notes" implies more than one, with authors and times. | D-09, E-18 |
| A-06 | The 3D asset model is split into an asset **version** (per model, holds the live flag and check results) and its **files** (one per tier). | The spec's single `Asset` row per tier cannot hold "switch the live version" cleanly. | D-11, D-12 |
| A-07 | Scheduled articles are public as soon as `publishedAt <= now` (query-time filter). A cron job finds newly due articles to fire revalidation. | Query-time visibility is exact; revalidation still needs a trigger. | F-17, I-07 |
| A-08 | The fixed showroom list is a code enum, not a table. | "A fixed list". | D-08 |
| A-09 | Rate limits: builds 20/hour/IP, enquiries 5/hour/IP, admin login 10 per 15 min per IP plus per email. | The spec gives the build limit only. | BR-18, BR-21, BR-38 |
| A-10 | `POST /configurator/validate` is a public, non-mutating call, rate-limited generously (120/min/IP) to bound abuse. | Not listed as rate-limited, but it is the most expensive public call. | E-09 |

## 15. Open decisions

These need the maintainer's call before the dependent sprint. None blocks Phase 0.

| ID | Decision | Options | Blocks |
| --- | --- | --- | --- |
| OD-01 | Rate-limit store | Upstash Redis behind the throttler, **or** Vercel Firewall rules | E-10, E-11, E-12 |
| OD-02 | Image width variants | Generate fixed widths at upload, **or** rely on frontend image optimisation over the Blob URL | E-26 |
| OD-03 | Admin alert email in V1 | Provider choice, or skip for V1 (spec: optional) | I-11 |
| OD-04 | Turnstile in V1 | On, or honeypot + rate limit only (spec: optional) | I-10 |
| OD-05 | Variant mismatch: reject or flag | Reject the version, **or** register it as `flagged` and forbid making it live | S-16 |
| OD-06 | Fate of code the spec does not ask for (`/auth/register`, `/users`, `/stats`) | Adopt, adapt or retire; see [Phase 8 › Unspecified in code](phase-8-implementation-roadmap.md#unspecified-in-code) | E-12 |

## 16. Non-goals

- Visitor accounts, saved garages, or sign-in for visitors.
- Payments, orders, dealer inventory or financing.
- Share-image generation (`POST /builds/:code/poster`), which is explicitly not V1.
- Multiple currencies or locales.
- Real customer contact. Submissions are a demo.
- Rendering anything. The backend never prescribes presentation.

## 17. Future scalability

- Per-trim `rulesVersion` if catalogue edits become frequent enough to mark too many builds outdated.
- Redis caching for the configurator payload, only if HTTP caching proves insufficient.
- Poster images for builds (post-V1).
- An `editor` role for journal-only staff (A-01).
- Moving the journal to a headless CMS (Payload or Sanity) without changing the public shape, as the spec allows.
- More models going from `teaser` to `live`: the data model already supports it.
