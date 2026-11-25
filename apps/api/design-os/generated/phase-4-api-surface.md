# Phase 4 — API Surface Blueprints

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 3 — Domain Model](phase-3-domain-model.md) · Next: [Phase 5 — Service Blueprints](phase-5-service-blueprints.md)

This phase is the only home for **request and response shapes**. Every other phase cites `E-xx`.

## Table of contents

1. [Surface-wide conventions](#1-surface-wide-conventions)
2. [Error catalogue](#2-error-catalogue)
3. [Endpoint index](#3-endpoint-index)
4. [Public read](#4-public-read) — E-01 to E-08
5. [Public write](#5-public-write) — E-09 to E-11
6. [Admin auth](#6-admin-auth) — E-12 to E-15
7. [Admin leads and builds](#7-admin-leads-and-builds) — E-16 to E-20
8. [Admin journal](#8-admin-journal) — E-21 to E-26
9. [Admin catalogue](#9-admin-catalogue) — E-27 to E-32
10. [Admin assets](#10-admin-assets) — E-33 to E-36
11. [Internal jobs and platform](#11-internal-jobs-and-platform) — E-37 to E-39

---

## 1. Surface-wide conventions

### Versioning and prefix

All routes live under `/api/v1` (BR-40). Paths below omit the prefix. A breaking change to a shape requires `/api/v2` for that route or a coordinated contract change (governance, [Phase 1 §9](phase-1-service-vision.md#9-governance)).

### Success envelope

The host convention wraps every success body. The spec's examples (validate result, manifest) are the `data` payload.

```json
{ "statusCode": 200, "message": "Success", "data": { /* payload as defined per endpoint */ }, "timestamp": "2026-11-24T10:00:00.000Z" }
```

Below, each **Response** shows `data` only. `204` responses have no body.

### Error envelope

Per the spec's convention:

```json
{ "error": { "code": "CONFIGURATION_INVALID", "message": "This configuration has conflicts.", "details": { } } }
```

- `code` is from the [error catalogue](#2-error-catalogue) and is stable; clients branch on it, never on `message`.
- `details` is optional; for `VALIDATION_FAILED` it is `{ "fields": [{ "path": "email", "rule": "isEmail", "message": "..." }] }`.
- Every error response also carries a `x-request-id` header for support.

### Pagination

Cursor-based. Query: `limit` (1–100, default 20), `cursor` (opaque string). Response `data`:

```json
{ "items": [ ], "nextCursor": "eyJpZCI6ImNtM..." }
```

`nextCursor` is `null` on the last page. Cursors encode the sort key and ID; a tampered cursor → `VALIDATION_FAILED`.

### Caching

| Class | Headers |
| --- | --- |
| Catalogue reads (E-01–E-03) | `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400` + `ETag` |
| Asset manifest (E-04) | `Cache-Control: public, max-age=60, s-maxage=60` + `ETag` |
| Build by code (E-05) | `Cache-Control: public, max-age=60` (the `outdated` flag can change) |
| Journal (E-06, E-07) | `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=3600` + `ETag` |
| Everything else | `Cache-Control: no-store` |

ETags are weak (`W/"…"`); `If-None-Match` hit → `304` with no body.

### Content types

Requests and responses are `application/json; charset=utf-8`, except E-26 (`multipart/form-data`). Unknown fields anywhere are rejected (BR-41).

### Authentication

Admin routes require the access cookie (I-02). Missing or invalid → `UNAUTHORIZED`; valid but wrong role → `FORBIDDEN`. Cookie-authenticated writes must send `Origin` from an allowed frontend domain → `FORBIDDEN` otherwise (CSRF defence alongside `SameSite=Lax`).

Jobs authenticate with `Authorization: Bearer <CRON_SECRET>`.

### OpenAPI

Published at `/api/v1/docs` (UI) and `/api/v1/docs-json` (document). Every DTO and enum is a named schema. Consumers generate types from the document (I-01).

## 2. Error catalogue

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Body, query or param fails its schema, or contains unknown fields |
| `CONSENT_REQUIRED` | 400 | Enquiry without `consent: true` |
| `CAPTCHA_FAILED` | 400 | Turnstile token invalid (when enabled) |
| `UNAUTHORIZED` | 401 | No or invalid admin session; bad cron secret |
| `INVALID_CREDENTIALS` | 401 | Login failed (any reason) |
| `SESSION_EXPIRED` | 401 | Refresh token missing, expired, revoked or reused |
| `FORBIDDEN` | 403 | Wrong role or disallowed `Origin` |
| `MODEL_NOT_FOUND` | 404 | |
| `TRIM_NOT_FOUND` | 404 | |
| `BUILD_NOT_FOUND` | 404 | Includes malformed codes |
| `ARTICLE_NOT_FOUND` | 404 | Includes drafts and future-scheduled on public routes |
| `ENQUIRY_NOT_FOUND` | 404 | |
| `RESOURCE_NOT_FOUND` | 404 | Generic admin catalogue and asset lookups |
| `ASSET_NOT_PUBLISHED` | 404 | Model has no live asset version |
| `MODEL_NOT_CONFIGURABLE` | 409 | Teaser model on a configurator, asset or build route (A-02) |
| `OPTION_NOT_AVAILABLE` | 422 | Option codes not offered on the trim; `details.codes` |
| `CONFIGURATION_INVALID` | 422 | Save attempted with conflicts; `details.conflicts` |
| `INVALID_STATUS_TRANSITION` | 422 | Enquiry status move not allowed |
| `RULE_CONFLICT` | 422 | Catalogue rule would create a cycle, contradiction or self-reference |
| `CATALOGUE_INVARIANT` | 422 | Catalogue change would break INV-02 |
| `ASSET_URL_INVALID` | 422 | Registered URL outside the issued prefix |
| `ASSET_INVALID` | 422 | GLB cannot be parsed |
| `ASSET_FILE_MISSING` | 422 | Registered file not found in storage |
| `ASSET_NOT_VERIFIED` | 422 | Making a non-verified version live |
| `UNSUPPORTED_MEDIA` | 415 | Image type not allowed |
| `PAYLOAD_TOO_LARGE` | 413 | Image above 4 MB |
| `SLUG_TAKEN` | 409 | |
| `CODE_TAKEN` | 409 | Catalogue code already exists |
| `CODE_IN_USE` | 409 | Changing or deleting a code referenced by builds or assets |
| `VERSION_TAKEN` | 409 | Asset version label already used for the model |
| `CONFLICT` | 409 | Optimistic concurrency failure |
| `RATE_LIMITED` | 429 | With `Retry-After` |
| `CODE_GENERATION_FAILED` | 500 | AVERO Code collisions exhausted retries |
| `INTERNAL_ERROR` | 500 | Unhandled; no internals in `message` |
| `SERVICE_UNAVAILABLE` | 503 | Database or storage unreachable |

## 3. Endpoint index

| ID | Method | Path | Access | Rate limit |
| --- | --- | --- | --- | --- |
| E-01 | GET | `/models` | Public | — |
| E-02 | GET | `/models/:code` | Public | — |
| E-03 | GET | `/models/:code/configurator` | Public | — |
| E-04 | GET | `/models/:code/assets` | Public | — |
| E-05 | GET | `/builds/:code` | Public | 120/min/IP |
| E-06 | GET | `/articles` | Public | — |
| E-07 | GET | `/articles/:slug` | Public | — |
| E-08 | GET | `/health` | Public | — |
| E-09 | POST | `/configurator/validate` | Public | 120/min/IP (A-10) |
| E-10 | POST | `/builds` | Public | 20/hour/IP (BR-18) |
| E-11 | POST | `/enquiries` | Public | 5/hour/IP (A-09) |
| E-12 | POST | `/admin/auth/login` | Public | 10/15 min per IP and per email |
| E-13 | POST | `/admin/auth/logout` | Admin (refresh cookie) | — |
| E-14 | POST | `/admin/auth/refresh` | Refresh cookie | 60/hour/IP |
| E-15 | GET | `/admin/auth/me` | Admin | — |
| E-16 | GET | `/admin/enquiries` | Admin | — |
| E-17 | GET | `/admin/enquiries/:id` | Admin | — |
| E-18 | PATCH | `/admin/enquiries/:id` | Admin | — |
| E-19 | GET | `/admin/builds` | Admin | — |
| E-20 | GET | `/admin/builds/popular-options` | Admin | — |
| E-21 | GET | `/admin/articles` | Admin | — |
| E-22 | GET | `/admin/articles/:id` | Admin | — |
| E-23 | POST | `/admin/articles` | Admin | — |
| E-24 | PATCH | `/admin/articles/:id` | Admin | — |
| E-25 | DELETE | `/admin/articles/:id` | Admin | — |
| E-26 | POST | `/admin/media/images` | Admin | 60/hour/admin |
| E-27 | CRUD | `/admin/catalogue/models` | Admin | — |
| E-28 | CRUD | `/admin/catalogue/trims` | Admin | — |
| E-29 | CRUD | `/admin/catalogue/categories` | Admin | — |
| E-30 | CRUD | `/admin/catalogue/options` | Admin | — |
| E-31 | CRUD | `/admin/catalogue/trims/:trimId/options` | Admin | — |
| E-32 | CRUD | `/admin/catalogue/rules` | Admin | — |
| E-33 | POST | `/admin/assets/upload-token` | Admin | 60/hour/admin |
| E-34 | POST | `/admin/assets` | Admin | — |
| E-35 | GET | `/admin/assets` | Admin | — |
| E-36 | PATCH | `/admin/assets/:id` | Admin | — |
| E-37 | GET | `/internal/cron/enquiry-retention` | Cron secret | — |
| E-38 | GET | `/internal/cron/publish-articles` | Cron secret | — |
| E-39 | GET | `/docs`, `/docs-json` | Public | — |

Spec routes are E-01–E-13, E-16–E-19, E-21–E-25, E-27–E-32, E-34, E-08. Routes added by this OS: E-14, E-15 (A-04), E-20 (split of "popular options"), E-26 (journal image upload), E-33, E-35, E-36 (asset upload and live switch, F-15), E-37, E-38 (cron, F-16/F-17), E-39 (spec convention).

Catalogue families E-27–E-32 each expand to list (`GET`), create (`POST`), update (`PATCH /:id`) and delete (`DELETE /:id`): 24 operations. Total: 39 IDs, 57 operations.

---

## 4. Public read

### E-01 GET /models

- **Purpose:** the lineup, including teasers (F-01).
- **Query:** none.
- **Response:**

```json
{ "items": [
  { "code": "gt", "name": "AVERO GT", "tagline": "Grand touring, redrawn.", "status": "live", "sortOrder": 0 },
  { "code": "rs", "name": "AVERO RS", "tagline": null, "status": "teaser", "sortOrder": 1 }
] }
```

- **Errors:** `SERVICE_UNAVAILABLE`. **Caching:** catalogue class. **Dependencies:** S-04, D-01.

### E-02 GET /models/:code

- **Purpose:** model detail with trims and specs (F-02).
- **Params:** `code` — catalogue code pattern.
- **Response:**

```json
{ "code": "gt", "name": "AVERO GT", "tagline": "Grand touring, redrawn.", "status": "live",
  "trims": [
    { "code": "gt-launch-edition", "name": "Launch Edition", "basePrice": 18950000, "currency": "EUR",
      "specs": { "powerKw": 485, "torqueNm": 800, "zeroTo100S": 3.4, "topSpeedKmh": 315, "weightKg": 1790, "extras": {} } }
  ] }
```

- **Errors:** `MODEL_NOT_FOUND`, `VALIDATION_FAILED`. **Caching:** catalogue class. **Dependencies:** S-04.

### E-03 GET /models/:code/configurator

- **Purpose:** everything the configurator needs, in one call (F-03).
- **Response:**

```json
{ "model": "gt", "rulesVersion": 3, "currency": "EUR",
  "trims": [ { "code": "gt-launch-edition", "name": "Launch Edition", "basePrice": 18950000,
    "defaults": ["paint-obsidian-black", "wheel-20-aero"] } ],
  "categories": [
    { "code": "paint", "name": "Paint", "selection": "single", "required": true,
      "options": [
        { "code": "paint-obsidian-black", "name": "Obsidian Black", "description": null,
          "swatchHex": "#0B0B0D", "thumbnailUrl": null,
          "prices": { "gt-launch-edition": 0 } }
      ] }
  ],
  "rules": [
    { "type": "requires", "option": "wheel-21-carbon", "target": "pkg-performance", "trim": null,
      "message": "Carbon wheels need the Performance Package." },
    { "type": "includes", "option": "pkg-performance", "target": "brakes-carbon-ceramic", "trim": null,
      "message": "Included with the Performance Package." }
  ] }
```

`prices` lists only trims that offer the option; absence means not available on that trim.

- **Errors:** `MODEL_NOT_FOUND`, `MODEL_NOT_CONFIGURABLE`. **Caching:** catalogue class; ETag from `rulesVersion`. **Dependencies:** S-03, S-04.

### E-04 GET /models/:code/assets

- **Purpose:** asset manifest by device tier (F-07).
- **Response:** exactly the spec's manifest:

```json
{ "model": "gt", "version": "2027.01.3",
  "tiers": {
    "desktop": { "url": "https://cdn.avero.example/gt/2027.01.3/gt-desktop.glb", "bytes": 13800000 },
    "mobile":  { "url": "https://cdn.avero.example/gt/2027.01.3/gt-mobile.glb",  "bytes": 5400000 },
    "poster":  { "url": "https://cdn.avero.example/gt/2027.01.3/gt-poster.mp4",  "bytes": 2600000 } },
  "environment": "https://cdn.avero.example/env/studio-2k.hdr",
  "variants": ["paint-obsidian-black", "paint-titanium-silver", "wheel-21-forged-graphite"] }
```

- **Errors:** `MODEL_NOT_FOUND`, `MODEL_NOT_CONFIGURABLE`, `ASSET_NOT_PUBLISHED`. **Caching:** manifest class. **Dependencies:** S-15.

### E-05 GET /builds/:code

- **Purpose:** restore a saved build (F-06).
- **Params:** `code` — `AV-XXXXXXXX` or `XXXXXXXX`, case-insensitive.
- **Response:**

```json
{ "code": "AV-7KQ2M9XD", "model": "gt", "trim": "gt-launch-edition",
  "selected": ["paint-obsidian-black", "wheel-21-carbon", "pkg-performance"],
  "included": ["brakes-carbon-ceramic"],
  "price": { "base": 18950000, "options": 2040000, "total": 20990000, "currency": "EUR" },
  "rulesVersion": 3, "outdated": false, "createdAt": "2026-12-14T09:12:44.000Z" }
```

- **Errors:** `BUILD_NOT_FOUND`, `RATE_LIMITED`. **Dependencies:** S-07.

### E-06 GET /articles

- **Purpose:** published journal list (F-09).
- **Query:** `category?` (`design|engineering|announcements`), `limit?`, `cursor?`.
- **Response:**

```json
{ "items": [
  { "slug": "drawing-the-gt", "title": "Drawing the GT", "excerpt": "…", "category": "design",
    "coverImageUrl": "https://cdn.avero.example/journal/…/cover.jpg", "authorName": "…",
    "publishedAt": "2027-03-01T08:00:00.000Z" } ],
  "nextCursor": null }
```

- **Errors:** `VALIDATION_FAILED`. **Caching:** journal class. **Dependencies:** S-11.

### E-07 GET /articles/:slug

- **Response:** list item fields plus:

```json
{ "body": { "type": "doc", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "…" } ] } ] },
  "seo": { "metaTitle": "Drawing the GT · AVERO", "metaDescription": "…", "ogImageUrl": "https://cdn.avero.example/…" },
  "images": { "cover": { "widths": { "640": "…", "1280": "…", "1920": "…" } } } }
```

`seo` fields fall back as in D-10, so they are never null. `images` is present when OD-02 resolves to upload-time variants.

- **Errors:** `ARTICLE_NOT_FOUND`. **Caching:** journal class. **Dependencies:** S-11.

### E-08 GET /health

```json
{ "status": "ok", "checks": { "database": "ok" }, "version": "1.4.0", "time": "2026-11-24T10:00:00.000Z" }
```

`status` is `ok` or `degraded` (HTTP 503 when degraded). `no-store`. **Dependencies:** S-22.

## 5. Public write

### E-09 POST /configurator/validate

- **Purpose:** validate a selection and return price and conflicts (F-04). Non-mutating.
- **Request:**

```json
{ "trim": "gt-launch-edition", "selected": ["paint-obsidian-black", "wheel-21-carbon", "trim-ivory-leather"] }
```

| Field | Rule |
| --- | --- |
| `trim` | Required, catalogue code pattern |
| `selected` | Required array, 0–50 unique catalogue codes |

- **Response:** the spec's shape, with `fix` always present on conflicts:

```json
{ "trim": "gt-launch-edition", "valid": false,
  "selected": ["paint-obsidian-black", "wheel-21-carbon", "trim-ivory-leather"],
  "included": [],
  "conflicts": [
    { "type": "requires", "option": "wheel-21-carbon", "needs": "pkg-performance",
      "message": "Carbon wheels need the Performance Package.",
      "fix": { "add": ["pkg-performance"], "remove": [] }, "fixPrice": 840000 }
  ],
  "price": { "base": 18950000, "options": 1200000, "total": 20150000, "currency": "EUR" },
  "rulesVersion": 3 }
```

Conflict `type` ∈ `requires | excludes | missing_required`. For `excludes`, `needs` is replaced by `conflictsWith` and `fix.remove` lists the option to drop. For `missing_required`, `option` is the category code. `fixPrice` is the price delta of applying the fix, so a message like "Add it for €8,400?" can be composed by the client. `price` is always computed for the resolved selection, valid or not.

- **Status:** 200 for both valid and invalid configurations.
- **Errors:** `VALIDATION_FAILED`, `TRIM_NOT_FOUND`, `MODEL_NOT_CONFIGURABLE`, `OPTION_NOT_AVAILABLE`, `RATE_LIMITED`.
- **Idempotency:** pure for a given `rulesVersion`. **Dependencies:** S-01, S-02, S-03.

### E-10 POST /builds

- **Request:** same body as E-09. Any other field (including `totalPrice`) → `VALIDATION_FAILED`.
- **Response (201):** the E-05 shape for the new build.
- **Errors:** `VALIDATION_FAILED`, `TRIM_NOT_FOUND`, `MODEL_NOT_CONFIGURABLE`, `OPTION_NOT_AVAILABLE`, `CONFIGURATION_INVALID` (`details.conflicts` = E-09 conflicts), `RATE_LIMITED`, `CODE_GENERATION_FAILED`.
- **Side effects:** one D-07 row. **Idempotency:** none (BR-17). **Dependencies:** S-06, S-07.

### E-11 POST /enquiries

- **Request:**

```json
{ "type": "test_drive", "name": "Ana Silva", "email": "ana@example.com", "phone": "+351 912 345 678",
  "message": "I'd like to drive this one.", "buildCode": "AV-7KQ2M9XD",
  "preferredDate": "2027-03-14", "showroom": "lisbon_atelier", "consent": true,
  "website": "", "captchaToken": "…" }
```

| Field | Rule |
| --- | --- |
| `type` | Required enum |
| `name` | Required, 1–120 chars, trimmed |
| `email` | Required, valid email, ≤ 254, lower-cased |
| `phone` | Optional, ≤ 32, digits, spaces, `+ ( ) -` |
| `message` | Required, 1–4000 |
| `buildCode` | Optional, AVERO Code format |
| `preferredDate` | Optional, `test_drive` only, today + 1 or later, ≤ 1 year ahead |
| `showroom` | Optional, `test_drive` only, enum |
| `consent` | Required, must be `true` |
| `website` | Honeypot; must be absent or empty |
| `captchaToken` | Required only when Turnstile is enabled |

- **Response (201):**

```json
{ "reference": "cm4x9…", "received": true, "demo": true }
```

A filled honeypot returns the same 201 with a random reference and stores nothing.

- **Errors:** `VALIDATION_FAILED`, `CONSENT_REQUIRED`, `CAPTCHA_FAILED`, `BUILD_NOT_FOUND`, `RATE_LIMITED`.
- **Side effects:** D-08 row; optional alert (I-11). **Dependencies:** S-08, S-20.

## 6. Admin auth

### E-12 POST /admin/auth/login

- **Request:** `{ "email": "admin@avero.example", "password": "…" }` (password 8–128 chars).
- **Response (200):** `{ "admin": { "id": "…", "email": "…", "name": "…", "role": "admin" } }` and two `Set-Cookie` headers (I-02).
- **Errors:** `VALIDATION_FAILED`, `INVALID_CREDENTIALS`, `RATE_LIMITED`. **Dependencies:** S-18.

### E-13 POST /admin/auth/logout

- **Response:** 204; both cookies cleared. Succeeds without a valid session. **Dependencies:** S-18.

### E-14 POST /admin/auth/refresh

- **Request:** no body; refresh cookie.
- **Response (200):** same as E-12, with rotated cookies.
- **Errors:** `SESSION_EXPIRED`, `RATE_LIMITED`. **Dependencies:** S-18.

### E-15 GET /admin/auth/me

- **Response:** `{ "admin": { … as E-12 } }`. **Errors:** `UNAUTHORIZED`.

## 7. Admin leads and builds

### E-16 GET /admin/enquiries

- **Query:** `type?`, `status?`, `from?`, `to?` (ISO dates), `hasBuild?` (boolean), `limit?`, `cursor?`.
- **Response item:**

```json
{ "id": "cm4x9…", "type": "test_drive", "status": "new", "name": "Ana Silva", "email": "ana@example.com",
  "buildCode": "AV-7KQ2M9XD", "preferredDate": "2027-03-14", "showroom": "lisbon_atelier",
  "createdAt": "2027-03-02T11:00:00.000Z", "noteCount": 0 }
```

### E-17 GET /admin/enquiries/:id

- **Response:** list item plus `phone`, `message`, `consentAt`, `updatedAt`, `build` (E-05 shape or null), `notes: [{ id, body, author: { id, name }, createdAt }]`.
- **Errors:** `ENQUIRY_NOT_FOUND`.

### E-18 PATCH /admin/enquiries/:id

- **Request:** `{ "status"?: "contacted", "note"?: "Called, booked for Friday.", "expectedStatus"?: "new" }`. At least one of `status` or `note`. `expectedStatus` enables the optimistic check (F-11 step 3); when omitted, the status read in the same transaction is used.
- **Response:** E-17 shape.
- **Errors:** `ENQUIRY_NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `CONFLICT`, `VALIDATION_FAILED`. **Dependencies:** S-09.

### E-19 GET /admin/builds

- **Query:** `trim?`, `from?`, `to?`, `limit?`, `cursor?`.
- **Response item:** E-05 shape plus `enquiryCount`.

### E-20 GET /admin/builds/popular-options

- **Query:** `from?`, `to?` (default last 30 days), `categories?` (default `paint,wheels`), `top?` (1–20, default 5).
- **Response:**

```json
{ "from": "2027-02-01", "to": "2027-03-02", "totalBuilds": 412,
  "categories": [ { "category": "paint", "options": [ { "code": "paint-obsidian-black", "name": "Obsidian Black", "count": 168, "share": 0.408 } ] } ] }
```

**Dependencies:** S-21.

## 8. Admin journal

### E-21 GET /admin/articles

- **Query:** `status?`, `category?`, `limit?`, `cursor?`. Includes drafts. Item: E-06 item + `id`, `status`, `updatedAt`.

### E-22 GET /admin/articles/:id

- **Response:** full article as stored (D-10 fields, raw SEO fields without fallbacks).

### E-23 POST /admin/articles

- **Request:**

```json
{ "slug": "drawing-the-gt", "title": "Drawing the GT", "excerpt": "…", "category": "design",
  "coverImageUrl": "https://cdn.avero.example/journal/…", "authorName": "…",
  "body": { "type": "doc", "content": [] },
  "status": "scheduled", "publishedAt": "2027-03-01T08:00:00.000Z",
  "metaTitle": null, "metaDescription": null, "ogImageUrl": null }
```

Body rules: allowed nodes `doc, paragraph, heading(level 2–4), text, pullQuote, image(fullBleed), specCallout, bulletList, orderedList, listItem, hardBreak`; marks `bold, italic, link(https or relative)`; max 200 KB serialised. Image `src` must be a CDN URL from this system.

- **Response (201):** E-22 shape. **Errors:** `VALIDATION_FAILED`, `SLUG_TAKEN`. **Side effects:** revalidation if visible (I-08).

### E-24 PATCH /admin/articles/:id

- **Request:** any subset of E-23 fields plus `expectedUpdatedAt` (optimistic lock).
- **Errors:** `ARTICLE_NOT_FOUND`, `SLUG_TAKEN`, `CONFLICT`, `VALIDATION_FAILED`. **Side effects:** revalidation when visibility or visible content changes.

### E-25 DELETE /admin/articles/:id

- **Response:** 204. **Side effects:** revalidation if it was visible.

### E-26 POST /admin/media/images

- **Request:** `multipart/form-data` with `file` (JPEG, PNG, WebP, AVIF; ≤ 4 MB; verified by content) and `purpose` (`cover | inline | og`).
- **Response (201):**

```json
{ "url": "https://cdn.avero.example/journal/2027/03/9f2c…/original.webp", "width": 2400, "height": 1350,
  "widths": { "640": "…", "1280": "…", "1920": "…" } }
```

`widths` is present when OD-02 chooses upload-time variants.

- **Errors:** `UNSUPPORTED_MEDIA`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`. **Dependencies:** S-13, I-04.

## 9. Admin catalogue

Every write returns `{ "item": { … }, "rulesVersion": 4, "warnings": [] }`. `warnings` lists non-blocking issues, such as an option now missing from the live asset's variants (F-15 coupling). Every delete is `DELETE /:id` → 204. Common errors: `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CODE_TAKEN`, `CODE_IN_USE`, `CATALOGUE_INVARIANT`.

| ID | Resource | Create / update fields | Version bump on | Extra errors |
| --- | --- | --- | --- | --- |
| E-27 | models | `code`, `name`, `tagline?`, `status`, `sortOrder` | `status` change | — |
| E-28 | trims | `code`, `modelCode`, `name`, `basePrice`, `specs`, `sortOrder` | `basePrice`, create, delete | — |
| E-29 | categories | `code`, `name`, `selection`, `required`, `sortOrder` | `selection`, `required` | — |
| E-30 | options | `code`, `categoryCode`, `name`, `description?`, `swatchHex?`, `thumbnailUrl?`, `isDefault`, `sortOrder` | `isDefault`, `categoryCode` | — |
| E-31 | trim options (availability + price) | path `trimId`; body `optionCode`, `price` | every write | — |
| E-32 | rules | `type`, `optionCode`, `targetOptionCode?`, `trimCode?`, `message` | every write | `RULE_CONFLICT` |

List endpoints accept `limit`, `cursor` and a resource filter (`modelCode`, `categoryCode`, `trimCode`, `type`).

## 10. Admin assets

### E-33 POST /admin/assets/upload-token

- **Request:** `{ "modelCode": "gt", "version": "2027.01.3", "tier": "desktop", "fileName": "gt-desktop.glb", "bytes": 13800000 }`. Also used with `tier: "environment"` for the HDR file.
- **Response:** `{ "pathname": "gt/2027.01.3/gt-desktop.glb", "clientToken": "…", "expiresAt": "…", "maxBytes": 52428800, "allowedContentTypes": ["model/gltf-binary"] }`.
- **Errors:** `MODEL_NOT_FOUND`, `MODEL_NOT_CONFIGURABLE`, `VERSION_TAKEN`, `VALIDATION_FAILED`. **Dependencies:** S-16, I-03.

### E-34 POST /admin/assets

- **Request:**

```json
{ "modelCode": "gt", "version": "2027.01.3",
  "files": { "desktop": { "url": "…", "bytes": 13800000 }, "mobile": { "url": "…", "bytes": 5400000 }, "poster": { "url": "…", "bytes": 2600000 } },
  "environmentUrl": "https://cdn.avero.example/env/studio-2k.hdr" }
```

- **Response (201):**

```json
{ "id": "cm5…", "model": "gt", "version": "2027.01.3", "status": "verified", "isLive": false,
  "variants": ["paint-obsidian-black", "…"], "missingCodes": [], "extraVariants": [],
  "warnings": [ { "code": "SIZE_BUDGET", "tier": "desktop", "bytes": 15400000, "budget": 15000000 } ],
  "files": [ { "tier": "desktop", "url": "…", "bytes": 13800000, "checksum": "sha256:…" } ] }
```

- **Errors:** `VERSION_TAKEN` (idempotent replay of identical input returns the existing version with 200), `ASSET_URL_INVALID`, `ASSET_FILE_MISSING`, `ASSET_INVALID`. **Dependencies:** S-16, S-17.

### E-35 GET /admin/assets

- **Query:** `modelCode` (required), `limit?`, `cursor?`. Items: E-34 response shape, newest first.

### E-36 PATCH /admin/assets/:id

- **Request:** `{ "isLive": true }`. Setting live unsets the previous live version (rollback = choose an older one).
- **Errors:** `RESOURCE_NOT_FOUND`, `ASSET_NOT_VERIFIED`. **Side effects:** manifest ETag changes.

## 11. Internal jobs and platform

### E-37 GET /internal/cron/enquiry-retention

- **Auth:** cron secret. **Response:** `{ "deletedEnquiries": 12, "deletedSessions": 3 }`. **Errors:** `UNAUTHORIZED`. **Dependencies:** S-10, I-06.

### E-38 GET /internal/cron/publish-articles

- **Auth:** cron secret. **Response:** `{ "published": 1, "revalidated": 2, "failed": 0 }`. **Dependencies:** S-12, S-14, I-07.

These use `GET` because the scheduler calls with `GET`; both are idempotent and `no-store`, and are excluded from the public OpenAPI document.

### E-39 GET /docs, /docs-json

OpenAPI UI and document (F-19). Public; contains no internal routes.
