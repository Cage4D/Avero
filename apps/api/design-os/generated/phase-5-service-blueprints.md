# Phase 5 — Service & Rule Blueprints

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 4 — API Surface](phase-4-api-surface.md) · Next: [Phase 6 — Integration Contracts](phase-6-integration-contracts.md)

Each service (`S-xx`) does one job. This phase is the only home for **algorithms**. Shapes are cited from [Phase 4](phase-4-api-surface.md) (`E-xx`) and [Phase 3](phase-3-domain-model.md) (`D-xx`); rules from [Phase 1](phase-1-service-vision.md#7-business-rules) (`BR-xx`).

## Table of contents

- [Service index](#service-index)
- [S-01 Rules engine](#s-01-rules-engine) — with [worked examples](#s-01-worked-examples)
- [S-02 Pricing](#s-02-pricing)
- [S-03 Configurator snapshot](#s-03-configurator-snapshot)
- [S-04 Catalogue read](#s-04-catalogue-read)
- [S-05 Catalogue admin](#s-05-catalogue-admin)
- [S-06 AVERO Code generator](#s-06-avero-code-generator)
- [S-07 Builds](#s-07-builds)
- [S-08 Enquiry intake](#s-08-enquiry-intake)
- [S-09 Lead management](#s-09-lead-management)
- [S-10 Retention](#s-10-retention)
- [S-11 Journal read](#s-11-journal-read)
- [S-12 Journal admin](#s-12-journal-admin)
- [S-13 Media](#s-13-media)
- [S-14 Revalidation](#s-14-revalidation)
- [S-15 Asset manifest](#s-15-asset-manifest)
- [S-16 Asset admin](#s-16-asset-admin)
- [S-17 GLB inspector](#s-17-glb-inspector)
- [S-18 Admin auth](#s-18-admin-auth)
- [S-19 Rate limiting](#s-19-rate-limiting)
- [S-20 Spam guard](#s-20-spam-guard)
- [S-21 Build analytics](#s-21-build-analytics)
- [S-22 Health](#s-22-health)
- [S-23 HTTP caching](#s-23-http-caching)

---

## Service index

| ID | Service | Pure? | Endpoints | Rules |
| --- | --- | --- | --- | --- |
| S-01 | Rules engine | **Pure** | E-09, E-10 | BR-07–BR-11 |
| S-02 | Pricing | **Pure** | E-09, E-10 | BR-01, BR-12 |
| S-03 | Configurator snapshot | I/O | E-03, E-09, E-10 | BR-02–BR-05, BR-13 |
| S-04 | Catalogue read | I/O | E-01, E-02, E-03 | BR-05 |
| S-05 | Catalogue admin | I/O | E-27–E-32 | BR-03, BR-06, BR-13 |
| S-06 | AVERO Code generator | **Pure** (given a random source) | E-10 | BR-14 |
| S-07 | Builds | I/O | E-05, E-10, E-19 | BR-15–BR-17 |
| S-08 | Enquiry intake | I/O | E-11 | BR-19–BR-21, BR-24, BR-25 |
| S-09 | Lead management | I/O | E-16–E-18 | BR-22 |
| S-10 | Retention | I/O | E-37 | BR-23 |
| S-11 | Journal read | I/O | E-06, E-07 | BR-28, BR-29 |
| S-12 | Journal admin | I/O | E-21–E-25, E-38 | BR-26–BR-30 |
| S-13 | Media | I/O | E-26 | BR-31 |
| S-14 | Revalidation | I/O | (internal) | BR-30 |
| S-15 | Asset manifest | I/O | E-04 | BR-32 |
| S-16 | Asset admin | I/O | E-33–E-36 | BR-32–BR-36 |
| S-17 | GLB inspector | **Pure** (on bytes) | (internal) | BR-33 |
| S-18 | Admin auth | I/O | E-12–E-15 | BR-37, BR-38 |
| S-19 | Rate limiting | I/O | all limited routes | BR-18, BR-21, BR-38 |
| S-20 | Spam guard | I/O | E-11 | BR-21 |
| S-21 | Build analytics | I/O | E-20 | — |
| S-22 | Health | I/O | E-08 | — |
| S-23 | HTTP caching | **Pure** | E-01–E-07 | — |

---

## S-01 Rules engine

**Purpose:** decide whether a selection on a trim is valid, resolve defaults, replacements and inclusions, and describe every conflict with a fix.

**Purity:** a pure function of `(snapshot, selected)`. No database, clock, randomness or logging inside. This is what makes it the most-tested unit in the codebase.

**Input**

```ts
snapshot: {
  trim: { code, basePrice },
  rulesVersion: number,
  categories: [{ code, selection: 'single' | 'multi', required: boolean, sortOrder }],
  options:    [{ code, category, price, isDefault, sortOrder }],   // only options offered on this trim
  rules:      [{ type: 'requires' | 'excludes' | 'includes' | 'default', option, target | null, message }] // already filtered to this trim
}
selected: string[]   // visitor's codes, in the order they were chosen; all offered on the trim (S-03 guarantees)
```

**Output:** the E-09 response payload minus nothing — `{ trim, valid, selected, included, conflicts, price, rulesVersion }`, with `price` from S-02.

### Algorithm (BR-10)

1. **Selections with replacement (BR-9).** Walk `selected` in order. For a `single` category, a later code replaces an earlier one in the same category. For a `multi` category, add the code (duplicates ignored). Result: set `S`.
2. **Defaults.** For each category with no code in `S`: add the options marked `isDefault`, plus targets of `default` rules whose option is in that category. For a `single` category take only the first by `sortOrder`. "Default" means *chosen when nothing else is* (BR-08), so defaults never override a visitor choice.
3. **Includes (closure).** Starting from `S`, follow `includes` rules transitively (visited set; cycles are safe). Each target becomes **included**: it is removed from `S` if present and added to set `I`. Included options are priced at zero (BR-12).
   - If an included option sits in a `single` category that already holds a different code in `S`, the included option wins and the displaced code produces an `excludes` conflict whose fix removes the displaced code.
4. **Requires.** For every option in `S ∪ I` and every `requires` rule from it: if the target is not in `S ∪ I`, add a `requires` conflict: `option`, `needs = target`, rule `message`, `fix = { add: [target], remove: [] }`.
5. **Excludes.** For every `excludes` rule whose option and target are both in `S ∪ I` (direction-independent), add an `excludes` conflict: `option = rule.option`, `conflictsWith = rule.target`, `fix.remove` = the target unless the target is included (then the option).
6. **Required categories.** For each `required` category with no code in `S ∪ I`, add a `missing_required` conflict with `option = category code` and `fix.add` = the category's first option by `sortOrder`.
7. **Fix prices.** For each conflict, `fixPrice = price(apply(fix)) − price(current)` using S-02 on the resolved sets, without re-running conflict detection.
8. **Result.** `valid = conflicts.length === 0`. `selected` = `S` and `included` = `I`, both sorted by category `sortOrder` then option `sortOrder`. Conflicts sorted by `type`, then `option`. Price from S-02 over `S` and `I`.

**Determinism:** same input → byte-identical output. The order of rules in the snapshot must not change the result.

**Invariants protected:** BR-07, BR-09, BR-10, BR-11, BR-12.

**Error mapping:** the engine never throws for business outcomes; conflicts are data. It throws only for a corrupted snapshot (unknown category on an option), which maps to `INTERNAL_ERROR` and is covered by the INV-02 seed test.

**Performance budget:** < 1 ms for 200 options and 500 rules (index rules by option once per call).

**Test focus (Q-RE-xx):** every rule type alone; each pair of rule types interacting; transitive includes; include cycle; include displacing a single-select choice; requires satisfied by an included option; excludes between an included and a selected option; multiple conflicts at once; required category without defaults; empty selection; selection equal to defaults; order-independence of rules; property test: `valid` results contain exactly one option per single category and every `requires` target.

### S-01 Worked examples

Shared snapshot (trim `gt-launch-edition`, base 18 950 000, `rulesVersion` 3):

| Option | Category | Price | Default |
| --- | --- | --- | --- |
| paint-obsidian-black | paint (single, required) | 0 | ✓ |
| paint-titanium-silver | paint | 290 000 | |
| paint-ivory-pearl | paint | 450 000 | |
| wheel-20-aero | wheels (single, required) | 0 | ✓ |
| wheel-21-carbon | wheels | 1 200 000 | |
| trim-ivory-leather | interior (single, required) | 0 | |
| trim-onyx-alcantara | interior | 0 | ✓ |
| pkg-performance | package (multi) | 840 000 | |
| brakes-carbon-ceramic | package | 650 000 | |

Rules: `wheel-21-carbon requires pkg-performance`; `trim-ivory-leather excludes paint-ivory-pearl`; `pkg-performance includes brakes-carbon-ceramic`.

**Example 1 — the spec's example (requires conflict)**

Input `selected`: `["paint-obsidian-black", "wheel-21-carbon", "trim-ivory-leather"]`

| Step | Result |
| --- | --- |
| 1 | S = {paint-obsidian-black, wheel-21-carbon, trim-ivory-leather} |
| 2 | All required categories covered; package has no default |
| 3 | No includes fire |
| 4 | wheel-21-carbon needs pkg-performance → conflict, fix add, fixPrice 840 000 |
| 5–6 | No excludes; nothing missing |
| Price | 18 950 000 + 1 200 000 = 20 150 000 |

Output matches the spec response shape in [E-09](phase-4-api-surface.md#e-09-post-configuratorvalidate): `valid: false`, `price.options 1200000`, `total 20150000`.

**Example 2 — fix applied (includes)**

Input: `["paint-obsidian-black", "wheel-21-carbon", "trim-ivory-leather", "pkg-performance"]`
→ includes adds brakes-carbon-ceramic to `I` at 0; requires satisfied. `valid: true`, `included: ["brakes-carbon-ceramic"]`, options 1 200 000 + 840 000 = 2 040 000, total 20 990 000.

**Example 3 — excludes**

Input: `["paint-ivory-pearl", "trim-ivory-leather"]`
→ wheels defaults to wheel-20-aero. Excludes fires: `option: trim-ivory-leather`, `conflictsWith: paint-ivory-pearl`, `fix.remove: ["paint-ivory-pearl"]`, fixPrice −450 000. Total shown: 18 950 000 + 450 000 = 19 400 000, `valid: false`.

**Example 4 — single-select replacement**

Input: `["paint-titanium-silver", "paint-ivory-pearl"]`
→ S keeps paint-ivory-pearl only (last wins); wheels and interior get defaults. `valid: true`, total 19 400 000.

**Example 5 — empty selection**

Input: `[]` → defaults only: obsidian black, 20" aero, onyx alcantara. `valid: true`, total 18 950 000.

**Example 6 — included option selected explicitly**

Input: `["pkg-performance", "brakes-carbon-ceramic"]` → brakes moves from `selected` to `included`, priced 0. Total 18 950 000 + 840 000 = 19 790 000. The visitor is never charged twice.

## S-02 Pricing

**Purpose:** compute `{ base, options, total, currency }`.

**Algorithm:** `base = trim.basePrice`; `options = Σ price(o) for o in S` (never `I`); `total = base + options`; `currency = 'EUR'`. Integer arithmetic only; overflow guard (total must stay below 2³¹−1, ≈ €21 million, else `INTERNAL_ERROR`).

**Purity:** pure. **Tests:** zero-price options, included options, the spec's figures, overflow guard.

## S-03 Configurator snapshot

**Purpose:** load the data S-01 needs, from the database, for one trim or for every trim of a model.

**Responsibilities:** resolve model and trim by code; refuse teasers (`MODEL_NOT_CONFIGURABLE`, A-02); load offered options with per-trim prices, categories, and rules where both ends are offered on the trim and `trimId` is null or matches; read the current `rulesVersion`; check that every selected code is offered (`OPTION_NOT_AVAILABLE` with the codes).

**Consistency:** reads the snapshot and `rulesVersion` in one read transaction (repeatable read), so the version returned matches the data used.

**Performance:** ≤ 4 queries; < 50 ms warm. Cache per `rulesVersion` within a warm instance is allowed (key includes the version, so it can never serve stale rules).

**Feeds:** E-03 (all trims, plus `defaults` per trim computed by running S-01 with `selected = []`), E-09, E-10.

## S-04 Catalogue read

**Purpose:** lineup and model detail (E-01, E-02); shapes the E-03 payload from S-03.

**Rules:** teasers appear with empty trims (BR-05). Specs are returned as stored, validated on write.

## S-05 Catalogue admin

**Purpose:** all catalogue writes (E-27–E-32) with the guards from F-14.

**Algorithm per write**

1. Validate the DTO; resolve referenced codes to IDs.
2. Code guards: a code referenced by any build (`selectedOptionCodes`, `includedOptionCodes`, `trimCode`) or by any asset version's `variants` cannot change → `CODE_IN_USE`. Hard-deleting a referenced option → `CODE_IN_USE` (remove its trim availability instead).
3. Rule guards (E-32): reject self-reference; reject `requires` cycles (DFS over existing `requires` edges plus the new one); reject a pair having both `requires` and `excludes` in either direction; `default` rules need a null target → `RULE_CONFLICT`.
4. Invariant guard: after the change, every trim of a `live` model still satisfies INV-02 → `CATALOGUE_INVARIANT`.
5. Transaction: write; if the change is a version-bumping change ([E-27–E-32 table](phase-4-api-surface.md#9-admin-catalogue)), insert `CatalogueRevision(version = current + 1, summary, changedBy)`. Serialise concurrent bumps by taking the next version from a row lock on the latest revision.
6. Warnings: for option availability changes on a model, compare with the live asset's `variants` and warn on gaps (F-15 coupling).

**Test focus:** each guard, concurrent version bumps, revision summary text.

## S-06 AVERO Code generator

**Purpose:** produce `AV-` + 8 characters (BR-14).

**Alphabet:** `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 symbols: no `0`, `1`, `O`, `I`, `L`). Space: 31⁸ ≈ 8.5 × 10¹¹.

**Algorithm:** draw bytes from a cryptographic random source; rejection-sample each byte (accept values < 248 = 31 × 8, take `value mod 31`) to avoid modulo bias; build the 8 characters; prefix `AV-`.

**Parse/normalise:** upper-case; strip whitespace; add `AV-` if missing; match `^AV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$`.

**Purity:** pure given an injected random source, so tests can make it deterministic. **Tests:** alphabet membership over 100k draws, length, prefix, normalisation, rejection of lookalikes.

## S-07 Builds

**Save (E-10):** rate limit (S-19) → S-03 snapshot → S-01 → if not valid `CONFIGURATION_INVALID` with conflicts → generate code (S-06) → insert snapshot (D-07, resolved `S` and `I`, prices, `rulesVersion`) → on unique violation of `code` retry, max 5 → `CODE_GENERATION_FAILED`.

**Restore (E-05):** normalise code (S-06) → load → compute `outdated = build.rulesVersion !== currentRulesVersion` → return stored values only (BR-16).

**Admin list (E-19):** cursor list with `enquiryCount`.

**Invariants:** INV-05, INV-06. There is no update method at all.

**Collision maths:** at 1 million builds the per-attempt collision chance is ≈ 1.2 × 10⁻⁶, so 5 attempts is ample.

## S-08 Enquiry intake

**Algorithm (E-11):** S-19 limit → DTO validation → S-20 honeypot (silent success) → S-20 Turnstile when enabled → consent check → type-specific checks (`preferredDate`/`showroom` only for `test_drive`; date window) → resolve `buildCode` (`BUILD_NOT_FOUND`) → insert with `status = new`, `consentAt = now` → fire admin alert (I-11) without awaiting failure into the response → return reference.

**Privacy:** no IP or user agent stored (BR-25). Logs mask email (`a***@example.com`).

## S-09 Lead management

**Transition table:** exactly the [Enquiry state machine](phase-3-domain-model.md#enquiry-br-22). A pure `canTransition(type, from, to)` function holds it and is unit-tested exhaustively (4 statuses × 4 statuses × 3 types).

**Update (E-18):** in one transaction: read; check `expectedStatus` if given; check transition; conditional update `WHERE id = ? AND status = ?` (0 rows → `CONFLICT`); append note with author.

## S-10 Retention

**Algorithm (E-37):** verify cron secret → delete enquiries with `createdAt < now − 90 days` in batches of 500 until none remain or 50 s elapse → delete admin sessions expired or revoked more than 30 days ago → log counts → return counts. Idempotent; safe to run twice.

## S-11 Journal read

**Visibility predicate (BR-28, A-07):** `status = published OR (status = scheduled AND publishedAt <= now)`. Used by both E-06 and E-07, defined once.

**List:** order `publishedAt desc, id desc`; cursor = `(publishedAt, id)`.

**SEO fallbacks (BR-29):** `metaTitle ?? title + " · AVERO"`, `metaDescription ?? excerpt`, `ogImageUrl ?? coverImageUrl`.

## S-12 Journal admin

**Body validation (BR-27):** walk the TipTap JSON; allow only the node and mark types listed in [E-23](phase-4-api-surface.md#e-23-post-adminarticles); drop unknown attributes; links must be `https:` or relative; image `src` must be on the CDN host. Max depth 20, max size 200 KB.

**Status rules:** per [Article lifecycle](phase-3-domain-model.md#article-br-26-br-28).

**Revalidation triggers:** compute `wasVisible` and `isVisible` (S-11 predicate) before and after the write; call S-14 when either is true and anything public changed (slug, title, excerpt, body, cover, SEO, category, visibility).

**Scheduled run (E-38):** set due `scheduled` articles to `published`; call S-14 for them and for any visible article whose `revalidatedAt < updatedAt`.

**Optimistic lock:** `expectedUpdatedAt` must equal the stored `updatedAt` → `CONFLICT`.

## S-13 Media

**Algorithm (E-26):** check size ≤ 4 MB before reading the stream fully → detect type from magic bytes (JPEG, PNG, WebP, AVIF) → `UNSUPPORTED_MEDIA` otherwise → read dimensions → strip metadata (EXIF, GPS) → store at `journal/<yyyy>/<mm>/<random>/original.<ext>` with immutable cache headers (I-04) → produce width variants 640/1280/1920 when OD-02 chooses upload-time variants → return URLs.

## S-14 Revalidation

**Purpose:** tell the frontend which paths changed (I-08).

**Algorithm:** POST the tag or path list to the frontend's revalidation endpoint with the shared secret; timeout 3 s; one retry; on success set `revalidatedAt = now` on the article; on failure log a warning and leave `revalidatedAt` stale so S-12's scheduled run retries. Never throws into the caller.

## S-15 Asset manifest

**Algorithm (E-04):** resolve model (teaser → `MODEL_NOT_CONFIGURABLE`) → load the `isLive` version with files → `ASSET_NOT_PUBLISHED` if none → shape per E-04 (`tiers` keyed by tier, `variants` from the version) → ETag = `W/"<model>-<version>"`.

## S-16 Asset admin

**Upload token (E-33):** check model is live and `(model, version)` unused → issue a client-upload token scoped to `pathname = <model>/<version>/<fileName>`, content type by tier (`model/gltf-binary` for GLB, `video/mp4` or `image/webp` for poster, `image/vnd.radiance` or `application/octet-stream` for HDR), max size 50 MB, expiry 15 min (I-03).

**Register (E-34):**

1. Validate every URL is under `https://<blob-host>/<model>/<version>/` → `ASSET_URL_INVALID`.
2. Idempotency: an identical existing `(model, version)` with the same URLs → return it (200).
3. For each GLB: fetch, stream-hash (SHA-256), read bytes; `HEAD` mismatch or 404 → `ASSET_FILE_MISSING`.
4. S-17 on each GLB → variant names. Desktop and mobile variant sets must be equal; if not, that is a warning (`TIER_VARIANT_MISMATCH`).
5. `expected` = every option code offered on any trim of the model in categories that are rendered in 3D (paint, wheels, interior; `package` is excluded unless the option maps to geometry — flag on the category, default false for `package`).
6. `missingCodes = expected − variants`; `extraVariants = variants − expected`.
7. Budgets: desktop 15 MB, mobile 6 MB → `SIZE_BUDGET` warnings (BR-34).
8. Status: `verified` if `missingCodes` empty; otherwise `rejected` or `flagged` per OD-05. Insert D-11 + D-12.

**Go live (E-36):** one transaction: require `verified` → `ASSET_NOT_VERIFIED`; unset current live; set this live with `liveAt = now`. The partial unique index backs INV-08.

**Function time:** fetching and parsing a 15 MB GLB fits within the function timeout; set the route's max duration to 60 s.

## S-17 GLB inspector

**Purpose:** extract `KHR_materials_variants` names from GLB bytes.

**Algorithm:** check the 12-byte header (`glTF` magic, version 2, length) → read the first chunk (type `JSON`) → parse → return `extensions.KHR_materials_variants.variants[].name` (empty list if the extension is absent) plus `extensionsUsed` and the mesh/material counts for diagnostics. The binary chunk is never parsed. Malformed → `ASSET_INVALID`.

**Library:** the spec suggests a glTF toolkit that reads GLB metadata in Node; reading only the JSON chunk needs none. Per the Library Selection Policy, propose the toolkit only if deeper checks are wanted (e.g. texture formats), and confirm before installing.

**Purity:** pure on a byte buffer. **Tests:** fixture GLBs with and without variants, truncated file, wrong magic, glTF 1.0.

## S-18 Admin auth

**Login (E-12):** S-19 limits (IP and email) → load by lower-cased email → verify with the existing password hashing utility; for unknown emails verify against a fixed dummy hash so timing matches → disabled → same `INVALID_CREDENTIALS` → create session: 32 random bytes as refresh token, store SHA-256 → sign access JWT (RS256, 15 min, claims `sub`, `role`, `sid`) → set cookies (I-02) → update `lastLoginAt`.

**Refresh (E-14):** hash cookie → find session by `refreshTokenHash`; if not found but matches some session's `previousTokenHash` → revoke all sessions of that admin, `SESSION_EXPIRED` (reuse detection) → check expiry and absolute cap → rotate (`previousTokenHash = current`, new token) → extend `expiresAt` to min(now + 7 d, absolute cap) → new access JWT.

**Logout (E-13):** revoke by refresh hash if present; clear cookies; always 204.

**Guarding admin routes:** verify the access cookie's JWT; check `role`; check the session `sid` is not revoked only on sensitive routes (catalogue, assets) — elsewhere the 15-minute expiry bounds exposure.

## S-19 Rate limiting

**Purpose:** fixed-window or sliding-window counters per route key and subject (IP, email, admin ID) in an external store (OD-01).

**Rules:** limits from the [endpoint index](phase-4-api-surface.md#3-endpoint-index). IP from the platform's trusted forwarded header only, never a client-supplied one. Exceeded → `RATE_LIMITED` with `Retry-After`. Store unavailable → **fail open** for reads and E-09, **fail closed** for E-12 (login), and fail open with a logged warning for E-10/E-11 (the honeypot and validation still apply).

## S-20 Spam guard

**Honeypot:** field `website` present and non-empty → silent success.
**Turnstile (OD-04):** verify the token server-side with the provider's verification endpoint (I-10); timeout 3 s; provider down → accept and log (availability over spam in a demo).
**Heuristics (logged only in V1):** more than 3 links in `message`.

## S-21 Build analytics

**Algorithm (E-20):** count each element of `selectedOptionCodes` across builds in `[from, to)` whose option belongs to the requested categories; join option names; compute `share = count / totalBuilds`; top N per category. One grouped query.

## S-22 Health

Run `SELECT 1` with a 1 s timeout → `ok` or `degraded` (503). Report build version from env. Never touches other tables.

## S-23 HTTP caching

**Purpose:** compute ETags and apply the cache classes from [Phase 4 §1](phase-4-api-surface.md#caching).

**ETag recipes:** E-01/E-02 → hash of (`rulesVersion`, max `Model.updatedAt`, max `Trim.updatedAt`); E-03 → `rulesVersion` + model code; E-04 → model + live version; E-06 → hash of the first page's `(id, updatedAt)` + query; E-07 → article `id` + `updatedAt`.

**Purity:** pure given inputs. Applied after the response is built; a matching `If-None-Match` returns 304.
