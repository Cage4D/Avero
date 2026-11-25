# Phase 9 — Quality Assurance

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 8 — Implementation Roadmap](phase-8-implementation-roadmap.md) · Start: [START_HERE](START_HERE.md)

Every item (`Q-<area>-nn`) is a pass/fail check with a method. An item passes only with evidence (a test name, a CI run, a screenshot of a header). Failing items block launch unless Deferred in [Phase 8](phase-8-implementation-roadmap.md) with a reason.

## Table of contents

| Area | Prefix | Items |
| --- | --- | --- |
| [Rule correctness](#rule-correctness) | Q-RE | 24 |
| [Input validation](#input-validation) | Q-IV | 12 |
| [Authorisation](#authorisation) | Q-AZ | 10 |
| [Security](#security) | Q-SE | 16 |
| [Privacy](#privacy) | Q-PV | 8 |
| [Data integrity](#data-integrity) | Q-DI | 12 |
| [Contract stability](#contract-stability) | Q-CT | 7 |
| [Error consistency](#error-consistency) | Q-ER | 7 |
| [Performance and load](#performance-and-load) | Q-PF | 7 |
| [Caching](#caching) | Q-CA | 7 |
| [Reliability](#reliability) | Q-RL | 7 |
| [Observability](#observability) | Q-OB | 6 |
| [Operability](#operability) | Q-OP | 8 |
| [Developer experience and maintainability](#developer-experience-and-maintainability) | Q-DX | 7 |
| **Total** | | **138** |

---

## Rule correctness

| ID | Check | Method | Cites |
| --- | --- | --- | --- |
| Q-RE-01 | Worked examples 1–6 reproduce exactly | Unit tests named after the examples | [S-01](phase-5-service-blueprints.md#s-01-worked-examples) |
| Q-RE-02 | Each rule type alone: requires, excludes, includes, default, single | Unit | BR-08 |
| Q-RE-03 | Single-select: later choice replaces earlier | Unit | BR-09 |
| Q-RE-04 | Defaults fill only empty categories, never override a choice | Unit | BR-10 |
| Q-RE-05 | Transitive includes | Unit | S-01 step 3 |
| Q-RE-06 | Includes cycle terminates | Unit | S-01 step 3 |
| Q-RE-07 | Included option displacing a single-select choice yields an excludes conflict with remove fix | Unit | S-01 step 3 |
| Q-RE-08 | Requires satisfied by an included option | Unit | BR-10 |
| Q-RE-09 | Excludes detected in either direction | Unit | S-01 step 5 |
| Q-RE-10 | Excludes between included and selected removes the selected one | Unit | S-01 step 5 |
| Q-RE-11 | Missing required category with no default → `missing_required` | Unit | S-01 step 6 |
| Q-RE-12 | Multiple simultaneous conflicts all reported, deterministic order | Unit | S-01 step 8 |
| Q-RE-13 | `fixPrice` correct for add and remove fixes | Unit | E-09 |
| Q-RE-14 | Included option never charged, even if also selected | Unit | BR-12 |
| Q-RE-15 | Price = base + options, integers only | Unit | BR-01, BR-12 |
| Q-RE-16 | Output identical regardless of rule order in the snapshot | Property test | S-01 |
| Q-RE-17 | Every `valid` result has one option per single category and all requires satisfied | Property test | S-01 |
| Q-RE-18 | Trim-scoped rules apply only to their trim | Integration | D-06 |
| Q-RE-19 | Options not offered on a trim → `OPTION_NOT_AVAILABLE` | Integration | F-04 |
| Q-RE-20 | Teaser model → `MODEL_NOT_CONFIGURABLE` on E-03, E-04, E-09, E-10 | Integration | A-02 |
| Q-RE-21 | Saving an invalid configuration → `CONFIGURATION_INVALID` with conflicts | Integration | BR-15 |
| Q-RE-22 | Restored build shows stored price after a price change, with `outdated: true` | Integration | BR-16 |
| Q-RE-23 | Enquiry transitions: every pair × type matches the state machine | Unit (exhaustive) | BR-22 |
| Q-RE-24 | Journal visibility predicate: draft, future-scheduled, due-scheduled, published | Unit + integration | BR-28 |

## Input validation

| ID | Check | Method |
| --- | --- | --- |
| Q-IV-01 | Every DTO rejects unknown fields | Generic e2e test sending `{ extra: 1 }` to every write route |
| Q-IV-02 | Every path param validated (codes, slugs, IDs) | e2e with malformed params |
| Q-IV-03 | Every query param validated with bounds (`limit` 1–100, enums, dates) | e2e |
| Q-IV-04 | `selected` capped at 50 unique codes | e2e |
| Q-IV-05 | E-10 rejects `totalPrice` or any client price | e2e (BR-07) |
| Q-IV-06 | E-11 field rules from E-11 table, incl. test-drive-only fields | e2e |
| Q-IV-07 | Email normalised to lower case | Unit |
| Q-IV-08 | TipTap body: unknown nodes, script-like attributes, `javascript:` links rejected | Unit (S-12) |
| Q-IV-09 | Trim `specs` validated against the spec schema | Unit |
| Q-IV-10 | Image upload type by magic bytes, not extension | e2e with a renamed file |
| Q-IV-11 | Tampered cursor → `VALIDATION_FAILED`, not 500 | e2e |
| Q-IV-12 | Body size limits: 1 MB global, 5 MB E-26 | e2e |

## Authorisation

| ID | Check | Method |
| --- | --- | --- |
| Q-AZ-01 | Every `/admin/*` route except login/refresh/logout requires the admin guard | Route enumeration test |
| Q-AZ-02 | No admin route reachable with no cookie → `UNAUTHORIZED` | e2e |
| Q-AZ-03 | Expired access token → `UNAUTHORIZED`; refresh restores | e2e with clock control |
| Q-AZ-04 | Refresh-token reuse revokes all sessions | e2e |
| Q-AZ-05 | Logout revokes the refresh token | e2e |
| Q-AZ-06 | Disabled admin cannot log in or refresh | e2e |
| Q-AZ-07 | Cron routes reject missing and wrong secret | e2e |
| Q-AZ-08 | Admin writes reject a foreign `Origin` | e2e |
| Q-AZ-09 | Bearer header ignored when `BEARER_AUTH_ENABLED` is false | e2e |
| Q-AZ-10 | `/auth/register` and any retired route absent per OD-06 | Route enumeration test |

## Security

| ID | Check | Method |
| --- | --- | --- |
| Q-SE-01 | OWASP API Top 10 review recorded | Review doc |
| Q-SE-02 | Login timing similar for unknown email vs wrong password | Timing test (± 20%) |
| Q-SE-03 | Passwords hashed with bcrypt cost ≥ 12 | Unit |
| Q-SE-04 | Rate limits enforced: E-10 (20/h), E-11 (5/h), E-12 (10/15 min IP + email), E-09, E-05 | e2e against the store |
| Q-SE-05 | Rate limit uses the platform IP header, ignores spoofed `X-Forwarded-For` | e2e |
| Q-SE-06 | If firewall rules are used, their numbers match `rate-limits.ts` | Checklist with screenshots |
| Q-SE-07 | Helmet headers present; HSTS in production | Header check |
| Q-SE-08 | CORS allows only configured origins, with credentials | e2e |
| Q-SE-09 | Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, correct domain and paths | Header check in staging |
| Q-SE-10 | Constant-time compare for cron and revalidation secrets | Code review |
| Q-SE-11 | No secrets in repo; `.env.example` has names only | Secret scan in CI |
| Q-SE-12 | Upload token scoped to one path, short-lived, content-type limited | e2e |
| Q-SE-13 | Registered asset URLs outside the issued prefix rejected | e2e |
| Q-SE-14 | Honeypot submissions store nothing and look identical to success | e2e |
| Q-SE-15 | Error responses leak no stack traces, SQL or file paths | e2e on forced errors |
| Q-SE-16 | Dependency audit clean of high/critical | CI audit |

## Privacy

| ID | Check | Method |
| --- | --- | --- |
| Q-PV-01 | Enquiry stores only Phase 3 §9 fields; no IP or user agent | Schema review |
| Q-PV-02 | Retention deletes enquiries > 90 days and their notes | Integration with backdated rows |
| Q-PV-03 | Retention job alert fires after 2 missed days | Staging test |
| Q-PV-04 | Logs mask emails and hash IPs; no bodies | Log sample review |
| Q-PV-05 | Alert emails carry no visitor message or contact details | Unit (I-11) |
| Q-PV-06 | Error tracking scrubs PII | Staging event review |
| Q-PV-07 | Image uploads stripped of EXIF/GPS | Unit |
| Q-PV-08 | Expired admin sessions purged after 30 days | Integration |

## Data integrity

| ID | Check | Method |
| --- | --- | --- |
| Q-DI-01 | Money columns are integers; no floats anywhere in price paths | Schema + code review |
| Q-DI-02 | `totalPrice = basePrice + optionsPrice` for every build | SQL check in staging |
| Q-DI-03 | No code path updates a build | Code search + review |
| Q-DI-04 | AVERO Codes: alphabet, length, uniqueness under 100k generations | Unit |
| Q-DI-05 | Option code referenced by a build cannot be renamed or deleted | e2e |
| Q-DI-06 | Every version-bumping catalogue write increments `rulesVersion` once, in the same transaction | Integration |
| Q-DI-07 | Concurrent catalogue writes never produce duplicate versions | Integration (parallel) |
| Q-DI-08 | Rule cycles and contradictions rejected | Unit |
| Q-DI-09 | INV-02 holds after seed and after each catalogue write | Integration |
| Q-DI-10 | At most one live asset version per model (index + service) | Integration |
| Q-DI-11 | Migrations apply cleanly from empty and from the current production schema | CI |
| Q-DI-12 | Seed is idempotent | Run twice in CI |

## Contract stability

| ID | Check | Method |
| --- | --- | --- |
| Q-CT-01 | Committed OpenAPI matches the regenerated one | CI diff |
| Q-CT-02 | Breaking changes detected and fail CI unless approved | CI diff tool |
| Q-CT-03 | Every DTO and enum is a named schema | Lint over the document |
| Q-CT-04 | Every route documents its error codes | Lint over the document |
| Q-CT-05 | Internal cron routes absent from the public document | Test |
| Q-CT-06 | Shared option, category and error code lists exported and in sync with the seed | Test |
| Q-CT-07 | Response examples in Phase 4 validate against the generated schemas | Test |

## Error consistency

| ID | Check | Method |
| --- | --- | --- |
| Q-ER-01 | Every error uses `{ error: { code, message, details? } }` | e2e over a sample of failures per route |
| Q-ER-02 | Validation errors list field paths | e2e |
| Q-ER-03 | Unknown exceptions → `INTERNAL_ERROR` with request ID | e2e with a forced throw |
| Q-ER-04 | Database down → `SERVICE_UNAVAILABLE` | Integration with stopped DB |
| Q-ER-05 | 429 responses carry `Retry-After` | e2e |
| Q-ER-06 | Not-found for drafts and missing articles is identical | e2e |
| Q-ER-07 | Malformed and unknown build codes give the same `BUILD_NOT_FOUND` | e2e |

## Performance and load

| ID | Check | Method |
| --- | --- | --- |
| Q-PF-01 | S-01 < 1 ms for 200 options / 500 rules | Benchmark test |
| Q-PF-02 | E-03 and E-09 at 50 rps, 5 min, p95 within SLOs | Load test (staging) |
| Q-PF-03 | Snapshot load ≤ 4 queries | Query count test |
| Q-PF-04 | No N+1 on admin lists | Query count test |
| Q-PF-05 | E-20 < 200 ms at 10k builds | Integration with generated data |
| Q-PF-06 | Cold start of the function < 1.5 s | Staging measurement |
| Q-PF-07 | E-34 completes within 60 s for a 15 MB GLB | Staging |

## Caching

| ID | Check | Method |
| --- | --- | --- |
| Q-CA-01 | Each route sends the cache class from Phase 4 §1 | e2e header checks |
| Q-CA-02 | `If-None-Match` → 304 on catalogue, manifest, journal | e2e |
| Q-CA-03 | Catalogue ETag changes after a version-bumping write | Integration |
| Q-CA-04 | Manifest ETag changes after a live switch | Integration |
| Q-CA-05 | Admin and error responses are `no-store` | e2e |
| Q-CA-06 | Versioned CDN files carry `immutable` and a 1-year max-age | Staging header check |
| Q-CA-07 | Publishing triggers revalidation; failure retried by E-38 | Integration with a stub endpoint |

## Reliability

| ID | Check | Method |
| --- | --- | --- |
| Q-RL-01 | Runtime uses the pooled URL; migrations the direct URL | Config review |
| Q-RL-02 | No in-memory state relied on across requests (except the version-keyed memo) | Code review |
| Q-RL-03 | Rate-limit store down: fail-open/closed per S-19 | Integration with the store stubbed down |
| Q-RL-04 | CAPTCHA, email and revalidation outages never fail the main write | Integration |
| Q-RL-05 | Cron jobs idempotent (run twice) | Integration |
| Q-RL-06 | Code generation retries on collision | Unit with a forced-collision random source |
| Q-RL-07 | Asset registration idempotent on replay | e2e |

## Observability

| ID | Check | Method |
| --- | --- | --- |
| Q-OB-01 | One structured log line per request with the I-13 fields | Log sample |
| Q-OB-02 | `x-request-id` on every response and in every log line | e2e |
| Q-OB-03 | 5xx reported to error tracking with request ID | Staging forced error |
| Q-OB-04 | Alerts configured (5xx rate, retention, reuse, rejected asset) | Dashboard review |
| Q-OB-05 | Health reports database status and version | e2e |
| Q-OB-06 | Uptime monitor on E-08 in staging and production | Dashboard review |

## Operability

| ID | Check | Method |
| --- | --- | --- |
| Q-OP-01 | Deploy runs migrations against the direct URL before promotion | Deploy log |
| Q-OP-02 | Rollback procedure documented and rehearsed (previous deploy + backward-compatible schema) | Drill |
| Q-OP-03 | Asset rollback via E-36 rehearsed | Staging drill |
| Q-OP-04 | Database restore drill from provider backups | Drill record |
| Q-OP-05 | CDN content types and CORS verified per file type | Staging script |
| Q-OP-06 | Crons visible and succeeding in the platform dashboard | Dashboard review |
| Q-OP-07 | Production seed refuses default admin credentials | Unit |
| Q-OP-08 | Env validation fails boot on missing required variables | Unit (existing pattern) |

## Developer experience and maintainability

| ID | Check | Method |
| --- | --- | --- |
| Q-DX-01 | `setup.sh` brings a fresh clone to a seeded, running API | Fresh clone run |
| Q-DX-02 | Host gate passes: typecheck, lint, test | CI |
| Q-DX-03 | No file over ~150 lines without a reason | Lint rule or review |
| Q-DX-04 | Prisma only in repos (and seed) | Lint rule (import restriction) |
| Q-DX-05 | `lib/` has no Nest imports | Lint rule |
| Q-DX-06 | Swagger UI usable locally with cookie auth | Manual |
| Q-DX-07 | README documents env, scripts, routes, crons | Review |
