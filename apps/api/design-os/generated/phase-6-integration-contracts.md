# Phase 6 — Integration & Job Contracts

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 5 — Service Blueprints](phase-5-service-blueprints.md) · Next: [Phase 7 — Backend Architecture](phase-7-backend-architecture.md)

This phase is the only home for **boundary behaviour**: every contract (`I-xx`) with something the backend does not fully control.

## Table of contents

| ID | Contract | Direction |
| --- | --- | --- |
| [I-01](#i-01-openapi-contract) | OpenAPI contract → frontend types | Outbound (build time) |
| [I-02](#i-02-admin-session-cookies) | Admin session cookies | Both |
| [I-03](#i-03-glb-client-upload-to-object-storage) | GLB client upload to object storage | Inbound (via browser) |
| [I-04](#i-04-server-upload-to-object-storage) | Server upload to object storage (images) | Outbound |
| [I-05](#i-05-cdn-delivery) | CDN delivery, CORS, content types | Outbound |
| [I-06](#i-06-cron-enquiry-retention) | Cron: enquiry retention | Inbound |
| [I-07](#i-07-cron-scheduled-publishing) | Cron: scheduled publishing | Inbound |
| [I-08](#i-08-frontend-revalidation-webhook) | Frontend revalidation webhook | Outbound |
| [I-09](#i-09-rate-limit-store) | Rate-limit store | Outbound |
| [I-10](#i-10-captcha-verification) | CAPTCHA verification (optional) | Outbound |
| [I-11](#i-11-admin-alert-email) | Admin alert email (optional) | Outbound |
| [I-12](#i-12-postgres) | Postgres (pooled and direct) | Outbound |
| [I-13](#i-13-error-tracking-and-logs) | Error tracking and logs | Outbound |
| [I-14](#i-14-blender-export-contract) | Blender export contract | Inbound (via I-03) |

---

## I-01 OpenAPI contract

| | |
| --- | --- |
| Purpose | Give the frontend types that cannot drift from the API (C-07) |
| Trigger | Every change to a route, DTO or enum; every CI run |
| Payload | OpenAPI 3 document; every DTO and enum is a named schema |
| Auth | None (public document); internal routes (E-37, E-38) excluded |
| Failure | CI fails when the regenerated document differs from the committed one, or when a diff tool reports a breaking change |

**Breaking-change policy**

| Change | Class |
| --- | --- |
| Add an optional response field, a new endpoint, a new error code | Non-breaking |
| Add a required request field; remove or rename any field; narrow an enum on a response; change a type | Breaking: needs both owners' approval and a coordinated frontend change in the same PR or release |
| Add an enum value to a response | Breaking for exhaustive client switches; treat as breaking |

**Shared constants:** the canonical list of option codes, category codes and error codes is exported alongside the generated types, so the 3D pipeline and the frontend use the same strings (I-14).

**Do:** regenerate the contract in the same PR as the API change. **Don't:** hand-edit generated types.

## I-02 Admin session cookies

| | |
| --- | --- |
| Purpose | Authenticate admins across `avero.example` (dashboard) and `api.avero.example` (API) |
| Issued by | E-12, rotated by E-14, cleared by E-13 |

| Cookie | Value | Attributes |
| --- | --- | --- |
| `avero_admin_at` | RS256 JWT, 15 min, claims `sub`, `role`, `sid`, `iat`, `exp`, `iss = avero-api`, `aud = avero-admin` | `HttpOnly; Secure; SameSite=Lax; Domain=.avero.example; Path=/; Max-Age=900` |
| `avero_admin_rt` | Opaque 256-bit token | `HttpOnly; Secure; SameSite=Lax; Domain=.avero.example; Path=/api/v1/admin/auth; Max-Age=604800` |

**Dashboard middleware:** may verify `avero_admin_at` locally with the API's **public** key (no network call) and redirect to sign-in when it is missing or expired; on expiry the dashboard calls E-14 and retries once. The private key never leaves the API.

**CORS:** `credentials: true`, origins limited to the frontend domains (exact match, from env). **CSRF:** `SameSite=Lax` + `Origin` check on admin writes ([Phase 4 §1](phase-4-api-surface.md#authentication)).

**Local development:** cookies without `Domain` and with `Secure` off on `http://localhost`, switched by environment.

**Security:** never accept the access token from a query string. The `Authorization: Bearer` header remains accepted for tooling (Swagger UI, tests) only when explicitly enabled by env, off in production.

**Observability:** log sign-in success and failure (masked email, hashed IP), refresh reuse detection (warning + alert).

## I-03 GLB client upload to object storage

| | |
| --- | --- |
| Purpose | Get files larger than the 4.5 MB function body limit into storage without passing through the API (BR-36) |
| Direction | Browser → object storage, authorised by the API |
| Trigger | Admin starts an upload (F-15 step 1) |

**Sequence:** dashboard calls E-33 → API returns a client token scoped to one `pathname`, allowed content types, max size and a 15-minute expiry → browser uploads directly with the storage SDK's client-upload method → dashboard calls E-34 with the resulting URLs.

**Rules:** `addRandomSuffix` off (paths are already versioned and unique); overwriting disallowed; cache-control on upload `public, max-age=31536000, immutable`.

**Failure:** token expired → request a new one; upload interrupted → retry with a new token on the same pathname (still unused); registered before upload finished → `ASSET_FILE_MISSING`.

**Security:** tokens are single-path; the API re-checks every URL prefix on registration (S-16); files are untrusted until S-17 verifies them.

**Don't:** register files by uploading through the API; rely on an upload-completed callback for state (the explicit E-34 call is the source of truth).

## I-04 Server upload to object storage

| | |
| --- | --- |
| Purpose | Store journal images that pass through the API (≤ 4 MB) |
| Trigger | E-26 |
| Payload | Image bytes after metadata stripping; path `journal/<yyyy>/<mm>/<random>/<name>.<ext>` |
| Auth | Storage read-write token from env |
| Timeouts | 10 s per put; no retry inside the request (admin retries) |
| Failure | `SERVICE_UNAVAILABLE` |

## I-05 CDN delivery

| | |
| --- | --- |
| Purpose | Visitors download GLB, KTX2, HDR, video and images straight from the CDN (C-06) |
| Direction | Outbound, no API involvement |

| Requirement | Value |
| --- | --- |
| Cache-Control | `public, max-age=31536000, immutable` on every versioned file |
| Content types | `.glb` → `model/gltf-binary`; `.ktx2` → `image/ktx2`; `.hdr` → `image/vnd.radiance`; `.mp4` → `video/mp4`; images by type |
| CORS | `Access-Control-Allow-Origin` for the frontend domains on GET; required for WebGL loaders |
| Versioning | New folder per version; manifests point at folders; files never overwritten (BR-32) |

**Verification:** a deploy check fetches one file per type and asserts the three headers (Q-OP-05). If the storage provider's defaults do not meet a requirement (for example a content type), set it explicitly at upload time.

## I-06 Cron: enquiry retention

| | |
| --- | --- |
| Schedule | Daily at 03:00 UTC |
| Target | E-37 |
| Auth | `Authorization: Bearer <CRON_SECRET>`, compared in constant time |
| Timeout | Function max duration 60 s; batched deletes resume next day if cut short |
| Idempotency | Yes |
| Failure | Logged; alert if it has not succeeded for 2 consecutive days (retention is a privacy promise) |

## I-07 Cron: scheduled publishing

| | |
| --- | --- |
| Schedule | Every 15 minutes |
| Target | E-38 |
| Auth | As I-06 |
| Idempotency | Yes |
| Failure | Logged; visibility is unaffected (A-07), only cache freshness |

## I-08 Frontend revalidation webhook

| | |
| --- | --- |
| Purpose | Refresh the frontend's cached journal pages without a redeploy (BR-30) |
| Direction | API → frontend |
| Trigger | S-12 visibility or content change; E-38 retries |
| Payload | `{ "tags": ["journal", "article:drawing-the-gt"], "paths": ["/journal", "/journal/drawing-the-gt"] }` |
| Auth | `Authorization: Bearer <REVALIDATE_SECRET>` (shared, rotated together) |
| Timeout / retry | 3 s, one retry; then deferred to the next E-38 run |
| Failure | Never fails the admin write; `revalidatedAt` stays stale |

The frontend owns the endpoint and decides how tags map to pages. The tag naming above is the agreed contract.

## I-09 Rate-limit store

| | |
| --- | --- |
| Purpose | Shared counters across stateless function instances |
| Options (OD-01) | Redis-compatible store from the platform marketplace behind the throttler, **or** platform firewall rules (no API code) |
| Keys | `rl:<route>:<subject>:<window>` with TTL = window |
| Timeout | 150 ms per call |
| Failure | Per S-19: fail open except login |
| Privacy | IPs live only as keys for the window length |

## I-10 CAPTCHA verification

| | |
| --- | --- |
| Purpose | Optional bot check on E-11 (OD-04) |
| Direction | API → provider verification endpoint |
| Payload | `{ secret, response: captchaToken, remoteip? }` |
| Timeout | 3 s |
| Failure | Provider down → accept and log |
| Env | `TURNSTILE_SECRET_KEY`; feature off when unset |

## I-11 Admin alert email

| | |
| --- | --- |
| Purpose | Optional notice to staff of a new enquiry (BR-24: nobody else is contacted) |
| Trigger | S-08 after insert |
| Payload | Type, enquiry reference, admin deep link. **No** visitor message or contact details in the email body (minimise PII in third-party systems) |
| Timeout | 3 s, fire-and-forget, no retry in V1 |
| Env | Provider API key and recipient list; feature off when unset |

## I-12 Postgres

| | |
| --- | --- |
| Runtime | `DATABASE_URL` = **pooled** connection (marketplace Postgres) |
| Migrations | `DIRECT_URL` = direct connection, used only by the migration tool |
| Connection | Lazy connect; small pool per instance; statement timeout 10 s |
| Transactions | Short; no network calls inside a transaction |
| Failure | `SERVICE_UNAVAILABLE`; health reports `degraded` |
| Backups | Provider point-in-time recovery; restore drill before launch (Q-OP-04) |

## I-13 Error tracking and logs

| | |
| --- | --- |
| Logs | Structured JSON: `time`, `level`, `requestId`, `route`, `status`, `durationMs`, `ipHash`; never bodies, passwords, tokens, or full emails |
| Errors | Error-tracking SDK (spec suggests Sentry's free tier) captures 5xx and unhandled exceptions with `requestId`; PII scrubbing on |
| Alerts | 5xx rate > 1% over 5 min; retention job missed 2 days; refresh-token reuse; asset registration `rejected` |
| Env | DSN from env; off in local and test |

## I-14 Blender export contract

| | |
| --- | --- |
| Purpose | Make the 3D file and the catalogue agree (BR-03, BR-33) |
| Parties | Cage (Blender export) ↔ backend (catalogue) |

**Contract**

1. Every option in a 3D-rendered category has a material variant in the GLB whose name is exactly the option code (lowercase kebab).
2. Desktop and mobile GLBs of one version carry the same variant set.
3. File names: `<model>-<tier>.glb`, uploaded under `<model>/<version>/`.
4. Version label: `YYYY.MM.N`.
5. The canonical code list comes from the shared contract export (I-01); Blender scripts read it rather than retyping codes.

**Enforcement:** S-16 + S-17 at registration; mismatch → `rejected` or `flagged` (OD-05).

**Do:** add the option in the catalogue first, then export with the new variant. **Don't:** rename a variant to match a typo in the catalogue; fix the catalogue (if the code is unused) or the export.
