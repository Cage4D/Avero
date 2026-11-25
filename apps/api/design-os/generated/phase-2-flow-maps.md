# Phase 2 — Capability & Flow Maps

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 1 — Service Vision](phase-1-service-vision.md) · Next: [Phase 3 — Domain Model](phase-3-domain-model.md)

Each flow (`F-xx`) describes what the server does, step by step, for one capability. Flows cite consumers (`C-xx`) and business rules (`BR-xx`) from Phase 1. Endpoints are assigned in [Phase 4](phase-4-api-surface.md) and services in [Phase 5](phase-5-service-blueprints.md).

## Table of contents

- [Capability map](#capability-map)
- Public: [F-01](#f-01-browse-the-lineup) · [F-02](#f-02-view-a-model) · [F-03](#f-03-load-configurator-data) · [F-04](#f-04-validate-and-price-a-configuration) · [F-05](#f-05-save-a-build) · [F-06](#f-06-restore-a-build) · [F-07](#f-07-fetch-the-asset-manifest) · [F-08](#f-08-submit-an-enquiry) · [F-09](#f-09-read-the-journal)
- Admin: [F-10](#f-10-admin-session) · [F-11](#f-11-manage-leads) · [F-12](#f-12-review-builds-and-popular-options) · [F-13](#f-13-author-and-publish-an-article) · [F-14](#f-14-edit-the-catalogue) · [F-15](#f-15-ship-a-3d-asset-version)
- Jobs and platform: [F-16](#f-16-enquiry-retention) · [F-17](#f-17-scheduled-publishing) · [F-18](#f-18-health-check) · [F-19](#f-19-contract-publication)
- [Cross-flow guarantees](#cross-flow-guarantees)

---

## Capability map

| Capability | Flows | Consumers | Primary rules |
| --- | --- | --- | --- |
| Catalogue | F-01, F-02, F-03, F-14 | C-01, C-02, C-03 | BR-01–BR-06 |
| Configurator | F-04 | C-01 | BR-07–BR-13 |
| Builds | F-05, F-06, F-12 | C-01, C-03 | BR-14–BR-19 |
| Enquiries | F-08, F-11, F-16 | C-01, C-03, C-04 | BR-20–BR-25 |
| Journal | F-09, F-13, F-17 | C-01, C-02, C-03, C-04 | BR-26–BR-31 |
| Assets | F-07, F-15 | C-01, C-03, C-05, C-06 | BR-32–BR-36 |
| Admin auth | F-10 | C-03 | BR-37, BR-38 |
| Platform | F-18, F-19 | all, C-07 | BR-40–BR-42 |

---

## F-01 Browse the lineup

| | |
| --- | --- |
| Intent | See every model, including teasers |
| Trigger | Visitor or frontend server requests the lineup |
| Entry points | C-01, C-02 |
| Trust crossings | None (anonymous read) |
| Side effects | None |
| Idempotency | Safe and cacheable |
| Consistency | May be stale up to the cache lifetime; ETag lets clients revalidate |
| Completion | Ordered list of models with status |
| Dependencies | BR-05; D-01 |

**Sequence**

1. Read all models ordered by `sortOrder`.
2. Compute an ETag from the catalogue `rulesVersion` and the latest model update time.
3. If the request's `If-None-Match` matches, answer *not modified*.
4. Return code, name, tagline, status and sort order for each.

**Failure paths:** database unavailable → `SERVICE_UNAVAILABLE`; clients keep their cached copy.

## F-02 View a model

| | |
| --- | --- |
| Intent | Model detail, trims and specs |
| Trigger | Request for one model by code |
| Entry points | C-01, C-02 |
| Side effects | None |
| Completion | Model with its trims (code, name, base price, specs) |
| Dependencies | BR-01, BR-05; D-01, D-02 |

**Sequence:** look up the model by code → `MODEL_NOT_FOUND` if absent → load trims ordered by sort order → for a teaser, return the model with an empty trim list → attach cache headers as in F-01.

## F-03 Load configurator data

| | |
| --- | --- |
| Intent | Everything the configurator needs, in one call |
| Trigger | The configurator opens for a model |
| Entry points | C-01, C-02 |
| Side effects | None |
| Completion | Trims, categories, options, per-trim prices, rules, defaults and `rulesVersion` |
| Dependencies | BR-02–BR-05, BR-08, BR-13; D-01–D-06, D-14 |

**Sequence**

1. Look up the model; `MODEL_NOT_FOUND` if absent; `MODEL_NOT_CONFIGURABLE` if it is a teaser (A-02).
2. Load the model's trims, the categories used by those trims, the options and their per-trim prices, and every rule touching those options.
3. Mark defaults per trim (option `isDefault` plus `default` rules).
4. Attach the current `rulesVersion` and an ETag derived from it.
5. Return one payload.

**Decision points:** an option with no `TrimOption` row for a trim is not offered on that trim.

**Note:** the client may use this payload to predict validation locally (BR-07), but the server's answer in F-04 always wins.

## F-04 Validate and price a configuration

| | |
| --- | --- |
| Intent | Know whether a selection is valid, what it costs and how to fix conflicts |
| Trigger | Every change in the configurator |
| Entry points | C-01 |
| Trust crossings | Untrusted selection list → server rules |
| Side effects | None (non-mutating, though a POST) |
| Idempotency | Same input + same `rulesVersion` → same output |
| Completion | Result with `valid`, `selected`, `included`, `conflicts`, `price`, `rulesVersion` |
| Dependencies | BR-07–BR-13; D-02–D-06, D-14; rate limit A-10 |

**Sequence**

1. Validate the body: a trim code and a list of option codes (unique, bounded length).
2. Load the trim's configurator snapshot (same data as F-03, for one trim).
3. Reject unknown trim (`TRIM_NOT_FOUND`) and teaser models (`MODEL_NOT_CONFIGURABLE`).
4. Reject option codes not offered on the trim (`OPTION_NOT_AVAILABLE`, listing the codes).
5. Run the pure rules engine (BR-10): defaults → selections with single-category replacement → includes → requires/excludes.
6. Run pricing (BR-12): base + chosen options, included options at zero.
7. Return the result with the snapshot's `rulesVersion`.

**Decision points:** a conflict is not an error. An invalid configuration is a successful response with `valid: false`.

**Failure paths:** malformed input → `VALIDATION_FAILED`; rate limit → `RATE_LIMITED`.

## F-05 Save a build

| | |
| --- | --- |
| Intent | Freeze a valid configuration under a shareable AVERO Code |
| Trigger | The visitor saves |
| Entry points | C-01 |
| Trust crossings | Untrusted selection → server validation → persisted snapshot |
| Side effects | One new build row |
| Idempotency | Not idempotent: each save creates a new code (BR-17). Clients should debounce. |
| Consistency | The stored price and `rulesVersion` equal what the engine computed in the same request |
| Completion | AVERO Code returned |
| Dependencies | BR-14–BR-18; D-07; F-04 |

**Sequence**

1. Check the per-IP rate limit (20/hour) → `RATE_LIMITED`.
2. Validate the body (trim code, option codes). Any client-sent price or total is rejected as an unknown field (BR-07, BR-41).
3. Run F-04 steps 2–6.
4. If not valid → `CONFIGURATION_INVALID` with the conflicts in `details`.
5. Generate a code (BR-14); insert; on unique-constraint collision regenerate, up to 5 attempts → `CODE_GENERATION_FAILED`.
6. Store the **resolved** selection (after defaults, replacement and includes), the total and the `rulesVersion`.
7. Return the code and the saved snapshot.

## F-06 Restore a build

| | |
| --- | --- |
| Intent | Reopen a saved build exactly as saved |
| Trigger | Someone opens a shared code |
| Entry points | C-01, C-02 |
| Side effects | None |
| Idempotency | Safe; cacheable for a long time except the `outdated` flag |
| Completion | Snapshot with `outdated` |
| Dependencies | BR-16, BR-17; D-07, D-14 |

**Sequence:** normalise the code (upper-case, accept with or without `AV-`) → validate its format (`BUILD_NOT_FOUND` if malformed, to avoid an existence oracle) → load → `BUILD_NOT_FOUND` if absent → set `outdated = build.rulesVersion != current rulesVersion` → return the stored price, never a recomputed one.

**Recovery path:** the client may send the stored selection to F-04 to see today's price, then save a new build (F-05).

## F-07 Fetch the asset manifest

| | |
| --- | --- |
| Intent | Know which 3D files to load for each device tier |
| Trigger | The viewer initialises |
| Entry points | C-01, C-02; files then fetched by C-06 |
| Side effects | None |
| Completion | Manifest: model, version, tier URLs and bytes, environment URL, variants |
| Dependencies | BR-32, BR-35; D-11, D-12 |

**Sequence:** look up the model → `MODEL_NOT_CONFIGURABLE` for teasers (A-02) → load the live asset version → `ASSET_NOT_PUBLISHED` if none → return the manifest with an ETag derived from the version → short cache lifetime on the manifest; files themselves are immutable (BR-32).

## F-08 Submit an enquiry

| | |
| --- | --- |
| Intent | Ask a question, ask about a vehicle, or request a test drive |
| Trigger | A visitor submits a form |
| Entry points | C-01 |
| Trust crossings | Untrusted personal data → stored record |
| Side effects | One enquiry row; optional admin alert (I-11) |
| Idempotency | Not idempotent; spam controls bound duplicates |
| Completion | Acknowledgement with an enquiry reference |
| Dependencies | BR-19–BR-25; D-07, D-08 |

**Sequence**

1. Check the per-IP rate limit → `RATE_LIMITED`.
2. Validate the body (BR-20); unknown fields → `VALIDATION_FAILED`.
3. Honeypot filled → respond with the same success shape but store nothing (silent drop, so bots learn nothing).
4. If Turnstile is enabled (OD-04), verify the token → `CAPTCHA_FAILED`.
5. `consent` must be `true` → `CONSENT_REQUIRED`.
6. `preferredDate` and `showroom` are accepted only for `test_drive` (preferred date must be in the future) → `VALIDATION_FAILED`.
7. If a build code is given, resolve it → `BUILD_NOT_FOUND`.
8. Insert with status `new`.
9. Fire the admin alert if configured; failure is logged, never surfaced to the visitor.
10. Return the reference and a note that this is a demo (BR-24).

## F-09 Read the journal

| | |
| --- | --- |
| Intent | List published articles; read one |
| Trigger | Journal index or article request |
| Entry points | C-01, C-02 |
| Side effects | None |
| Completion | Cursor-paginated list (filterable by category); one article with body and SEO fields |
| Dependencies | BR-26–BR-29; D-10 |

**Sequence (list):** validate `category`, `limit`, `cursor` → select articles that are `published`, or `scheduled` with `publishedAt <= now` (A-07) → order by `publishedAt` desc, `id` desc → return items without bodies, plus `nextCursor`.

**Sequence (one):** look up by slug with the same visibility filter → `ARTICLE_NOT_FOUND` for drafts, future-scheduled or missing articles (no distinction, BR-28).

## F-10 Admin session

| | |
| --- | --- |
| Intent | Sign in, stay signed in, sign out |
| Entry points | C-03 |
| Trust crossings | Credentials → session cookies |
| Side effects | Session row created, rotated or revoked; last-login time |
| Dependencies | BR-37, BR-38; D-13, D-15; I-02; A-04 |

**Sequence (sign in)**

1. Rate-limit per IP and per email → `RATE_LIMITED`.
2. Validate email and password.
3. Look up the admin; verify the hash in constant time. Unknown email and wrong password give the same `INVALID_CREDENTIALS` and similar timing.
4. Disabled admin → `INVALID_CREDENTIALS`.
5. Create a session (hashed refresh token, expiry, user agent, IP).
6. Set the access cookie (15 min) and the refresh cookie (7 days, path-scoped to the auth routes).
7. Return the admin profile.

**Sequence (refresh):** read the refresh cookie → find the session by hash → missing, expired or revoked → `SESSION_EXPIRED` and clear cookies → reuse of an already-rotated token → revoke every session for that admin (theft signal) → rotate the token and issue a new access cookie.

**Sequence (sign out):** revoke the current session → clear both cookies → succeed even if the session is already gone.

**Sequence (current admin):** verify the access cookie → return the profile; the dashboard's middleware relies on this or on verifying the access token directly (I-02).

## F-11 Manage leads

| | |
| --- | --- |
| Intent | Find, read and move enquiries through the pipeline; add notes |
| Entry points | C-03 |
| Side effects | Status change, note rows, `updatedAt` |
| Consistency | Status transitions are checked against the current status in the same write (optimistic) |
| Dependencies | BR-22; D-08, D-09 |

**Sequence (list):** filter by type, status, date range and has-build → cursor pagination, newest first → include the linked build code.

**Sequence (update)**

1. Load the enquiry → `ENQUIRY_NOT_FOUND`.
2. If a status is sent, check the transition (BR-22): `new → contacted`, `contacted → scheduled` (test drives only), `contacted|scheduled → closed`, `new → closed` (spam or no-show). Anything else → `INVALID_STATUS_TRANSITION`.
3. Write the status only if it is still the status that was read → `CONFLICT` otherwise.
4. If a note is sent, append it with the author and time.
5. Return the updated enquiry with notes.

## F-12 Review builds and popular options

| | |
| --- | --- |
| Intent | See recent builds and the most popular paint and wheel choices |
| Entry points | C-03 |
| Side effects | None |
| Dependencies | D-07, D-04 |

**Sequence:** list builds newest first with cursor pagination, filterable by trim and date → for popularity, count option codes across builds in a period (default: last 30 days) grouped by category, top N per category.

## F-13 Author and publish an article

| | |
| --- | --- |
| Intent | Write, preview, schedule and publish journal articles |
| Entry points | C-03 |
| Side effects | Article rows, image uploads to object storage, revalidation webhook |
| Dependencies | BR-26–BR-31; D-10; I-04, I-08 |

**Sequence (create/update)**

1. Validate fields; the body must be a valid TipTap document whose node and mark types are on the allowed list (paragraph, heading, pull quote, full-bleed image, spec callout, plus basic marks). Unknown node types → `VALIDATION_FAILED`.
2. Strip any attribute not on the allowed list; links may only use `https:` or relative URLs.
3. Slug unique → `SLUG_TAKEN`.
4. Status rules: `draft` needs no date; `scheduled` needs a future `publishedAt`; `published` sets `publishedAt = now` if absent.
5. Save. If the article became publicly visible, or a visible article changed, call revalidation (I-08) for the article and the journal index. Webhook failure is logged and retried by the next publishing cron run; it never fails the save.

**Sequence (image upload):** accept one image ≤ 4 MB of an allowed type → verify by content, not extension → store under a new immutable path → produce width variants per OD-02 → return URLs.

**Sequence (delete):** delete the article row → revalidate if it was visible. Images stay (immutable, may be shared).

## F-14 Edit the catalogue

| | |
| --- | --- |
| Intent | Change models, trims, categories, options, prices and rules without a deploy |
| Entry points | C-03 |
| Side effects | Catalogue rows; `rulesVersion` increment; new ETags |
| Consistency | Every change and its version increment commit in one transaction |
| Dependencies | BR-02–BR-06, BR-13, BR-33; D-01–D-06, D-14 |

**Sequence**

1. Validate the change.
2. Guard the stable codes: an option code already used by any build or any asset version cannot be renamed → `CODE_IN_USE` (BR-03). The display name can change freely.
3. Guard rule integrity: no self-references, both options must exist, `requires` cycles and `requires`+`excludes` contradictions between the same pair are rejected → `RULE_CONFLICT`.
4. Guard deletions: an option referenced by a build is not deleted; it is removed from the trim (its `TrimOption` deleted) instead → `CODE_IN_USE` on hard delete.
5. In one transaction: write the change; if it touches prices, availability or rules, increment `rulesVersion` and record a revision (who, when, what).
6. Return the updated record and the new `rulesVersion`.

**Effect:** existing builds become `outdated` on their next read (F-06), and catalogue ETags change, so caches revalidate.

## F-15 Ship a 3D asset version

| | |
| --- | --- |
| Intent | Upload a new GLB set, check it against the catalogue, make it live, roll back |
| Entry points | C-03 (operated for C-05) |
| Trust crossings | Untrusted GLB in object storage → verified version |
| Side effects | Files in object storage; version and file rows; live pointer |
| Dependencies | BR-32–BR-36; D-11, D-12; I-03, I-05 |

**Sequence**

1. **Token:** the admin requests an upload token for a model, a version label and a tier. The server checks the version label is new for the model and issues a scoped client-upload token restricted to that path prefix, allowed content types and a maximum size.
2. **Upload:** the browser uploads straight to object storage (BR-36). The API is not in the byte path.
3. **Register:** the admin registers the version: model, version label, the tier files (URL, bytes), the environment map URL. The server checks every URL is under the issued prefix → `ASSET_URL_INVALID`.
4. **Check:** the server reads each GLB's header and JSON chunk from storage, extracts `KHR_materials_variants` names, and compares them with every option code offered on the model's trims (BR-33). It records missing codes and extra variants, computes checksums, and compares sizes with budgets (BR-34).
5. **Outcome:** no missing codes → `verified`; missing codes → `rejected` or `flagged` per OD-05. Over-budget → warning recorded, not a failure.
6. **Go live:** the admin sets a `verified` version live. In one transaction the previous live version is unset. A non-verified version → `ASSET_NOT_VERIFIED`.
7. **Rollback:** the same operation, choosing an earlier verified version (BR-35).

**Failure paths:** file missing in storage → `ASSET_FILE_MISSING`; unparseable GLB → `ASSET_INVALID`; storage unavailable → `SERVICE_UNAVAILABLE` (registration can be retried; it is idempotent on model + version label).

**Catalogue coupling:** when F-14 adds an option to a model, the live version may now lack its variant. F-14 reports this as a warning in its response; it does not block the catalogue edit.

## F-16 Enquiry retention

| | |
| --- | --- |
| Trigger | Daily schedule (C-04) |
| Side effects | Deletes enquiries and their notes older than 90 days |
| Idempotency | Yes; re-running deletes nothing new |
| Dependencies | BR-23; D-08, D-09; I-06 |

**Sequence:** verify the cron secret → `UNAUTHORIZED` → delete in batches where `createdAt < now − 90 days` → log the count → return the count.

## F-17 Scheduled publishing

| | |
| --- | --- |
| Trigger | Schedule every 15 minutes (C-04) |
| Side effects | Article status `scheduled → published`; revalidation calls |
| Idempotency | Yes |
| Dependencies | BR-28, BR-30; D-10; I-07, I-08 |

**Sequence:** verify the cron secret → find `scheduled` articles with `publishedAt <= now`, plus any article whose last revalidation failed → set them `published` → call revalidation for each and the index → record success → return counts.

Visibility does not depend on this job (A-07); only freshness of the frontend cache does.

## F-18 Health check

Verify the process is up and the database answers a trivial query within 1 s. Return `ok` or `degraded` with per-dependency status. Never cached. Used by uptime monitoring.

## F-19 Contract publication

On every build, the OpenAPI document is generated from the compiled API and written to the shared contract package, which generates TypeScript types. CI regenerates and diffs it; a breaking change fails the build unless the PR is labelled as an agreed breaking change (I-01). The document is also served at `/api/v1/docs`.

---

## Cross-flow guarantees

| Guarantee | Flows |
| --- | --- |
| No client-supplied price, total, role or identity is trusted | F-04, F-05, F-08, F-10 |
| Every write that changes rule outcomes increments `rulesVersion` in the same transaction | F-14 |
| Snapshots (builds, asset files) are never mutated | F-05, F-15 |
| Personal data leaves the system on schedule | F-16 |
| Non-visible content is indistinguishable from missing content to the public | F-06, F-09 |
