# Phase 3 — Domain Model & Data Architecture

> AVERO Backend OS · v1.0 · generated 2026-11-24
> Previous: [Phase 2 — Flow Maps](phase-2-flow-maps.md) · Next: [Phase 4 — API Surface](phase-4-api-surface.md)

This phase is the only home for **data at rest**: entities (`D-xx`), relationships, invariants, lifecycles, retention and the reference schema.

## Table of contents

1. [Bounded contexts](#1-bounded-contexts)
2. [Entity catalogue](#2-entity-catalogue)
3. [Relationships](#3-relationships)
4. [Invariants](#4-invariants)
5. [Lifecycles and state machines](#5-lifecycles-and-state-machines)
6. [Immutability and versioning](#6-immutability-and-versioning)
7. [Conventions: money, time, identifiers](#7-conventions-money-time-identifiers)
8. [Stable cross-system codes](#8-stable-cross-system-codes)
9. [Personal data inventory](#9-personal-data-inventory)
10. [Retention and deletion](#10-retention-and-deletion)
11. [Indexes and query patterns](#11-indexes-and-query-patterns)
12. [Migration strategy](#12-migration-strategy)
13. [Seed strategy](#13-seed-strategy)
14. [Reference schema](#14-reference-schema)
15. [Future expansion](#15-future-expansion)

---

## 1. Bounded contexts

| Context | Entities | Owns flows |
| --- | --- | --- |
| Catalogue | D-01 Model, D-02 Trim, D-03 OptionCategory, D-04 Option, D-05 TrimOption, D-06 OptionRule, D-14 CatalogueRevision | F-01–F-03, F-14 |
| Configurator | None of its own; reads Catalogue | F-04 |
| Builds | D-07 Build | F-05, F-06, F-12 |
| Enquiries | D-08 Enquiry, D-09 EnquiryNote | F-08, F-11, F-16 |
| Journal | D-10 Article | F-09, F-13, F-17 |
| Assets | D-11 AssetVersion, D-12 AssetFile | F-07, F-15 |
| Admin identity | D-13 AdminUser, D-15 AdminSession | F-10 |

Cross-context references go by stable code or ID, read-only. Builds read Catalogue; Enquiries reference Builds; Assets read option codes from Catalogue.

## 2. Entity catalogue

### D-01 Model

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| code | string, unique | `gt`, `rs`, `x`. Lowercase kebab. |
| name | string | |
| tagline | string? | |
| status | `live` \| `teaser` | BR-05 |
| sortOrder | int | Lineup order |
| createdAt, updatedAt | timestamp | |

### D-02 Trim

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| code | string, unique | e.g. `gt-launch-edition` |
| modelId | → D-01 | |
| name | string | |
| basePrice | int (EUR cents) | BR-01 |
| specs | JSON | Spec sheet; validated against a spec schema on write (power, torque, 0–100, top speed, range, weight, dimensions, free-form extras) |
| sortOrder | int | |
| createdAt, updatedAt | timestamp | |

### D-03 OptionCategory

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| code | string, unique | `paint`, `wheels`, `interior`, `package` |
| name | string | |
| selection | `single` \| `multi` | BR-08 |
| required | boolean | Paint and wheels: `single` + required (BR-09) |
| sortOrder | int | |

### D-04 Option

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| code | string, unique | = Blender variant name (BR-03). Pattern `^[a-z0-9]+(-[a-z0-9]+)*$`, max 64 |
| categoryId | → D-03 | |
| name | string | |
| description | string? | |
| swatchHex | string? | `#RRGGBB` |
| thumbnailUrl | string? | CDN URL |
| isDefault | boolean | Default within its category when nothing else is chosen |
| sortOrder | int | |
| createdAt, updatedAt | timestamp | |

### D-05 TrimOption

Availability and price of an option on a trim. Composite key `(trimId, optionId)`.

| Field | Type | Notes |
| --- | --- | --- |
| trimId | → D-02 | |
| optionId | → D-04 | |
| price | int (EUR cents) | ≥ 0. BR-04 |

### D-06 OptionRule

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| type | `requires` \| `excludes` \| `includes` \| `default` | `single` is a category property (D-03), not a rule row |
| optionId | → D-04 | Subject (A) |
| targetOptionId | → D-04? | Object (B). Null only for `default` |
| trimId | → D-02? | Null = applies on every trim offering both options |
| message | string | Human message shown on conflict (BR-11) |
| createdAt, updatedAt | timestamp | |

Unique on `(type, optionId, targetOptionId, trimId)`.

### D-07 Build

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | Internal only |
| code | string, unique | AVERO Code (BR-14), stored with prefix, e.g. `AV-7KQ2M9XD` |
| trimId | → D-02 | |
| trimCode | string | Snapshot, survives trim renames |
| selectedOptionCodes | string[] | Resolved selection, as saved (BR-17) |
| includedOptionCodes | string[] | Snapshot of what `includes` added |
| basePrice | int | Snapshot |
| optionsPrice | int | Snapshot |
| totalPrice | int | Snapshot (BR-16) |
| currency | `EUR` | |
| rulesVersion | int | Snapshot (BR-16) |
| createdAt | timestamp | No `updatedAt`: immutable |

### D-08 Enquiry

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | Also the public reference |
| type | `general` \| `vehicle` \| `test_drive` | |
| name | string (≤ 120) | PII |
| email | string (≤ 254) | PII |
| phone | string? (≤ 32) | PII |
| message | string (≤ 4000) | May contain PII |
| buildId | → D-07? | BR-19 |
| preferredDate | date? | Test drives only |
| showroom | enum? | Fixed fictional list (A-08) |
| consent | boolean | Must be `true` to exist |
| consentAt | timestamp | |
| status | `new` \| `contacted` \| `scheduled` \| `closed` | BR-22 |
| createdAt, updatedAt | timestamp | `createdAt` drives retention |

No IP address or user agent is stored on the enquiry (BR-25). Rate limiting uses the request IP transiently in the rate-limit store only.

### D-09 EnquiryNote

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| enquiryId | → D-08, cascade delete | |
| authorId | → D-13 | |
| body | string (≤ 2000) | |
| createdAt | timestamp | Append-only (A-05) |

### D-10 Article

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| slug | string, unique | Kebab case, ≤ 96 |
| title | string | |
| excerpt | string | |
| category | `design` \| `engineering` \| `announcements` | BR-26 |
| coverImageUrl | string | CDN URL |
| body | JSON | TipTap document, allow-listed nodes (BR-27) |
| authorName | string | Display name, not an account link |
| status | `draft` \| `scheduled` \| `published` | |
| publishedAt | timestamp? | Required unless `draft` |
| metaTitle, metaDescription | string? | Fall back to title and excerpt when empty |
| ogImageUrl | string? | Falls back to cover image |
| revalidatedAt | timestamp? | Last successful revalidation (F-17 retry) |
| createdById, updatedById | → D-13 | Audit |
| createdAt, updatedAt | timestamp | |

### D-11 AssetVersion

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| modelId | → D-01 | |
| version | string | e.g. `2027.01.3`; unique per model |
| environmentUrl | string | HDR environment map |
| variants | string[] | Variant names read from the GLBs |
| missingCodes | string[] | Option codes with no variant (BR-33) |
| extraVariants | string[] | Variants with no option code (informational) |
| status | `pending` \| `verified` \| `flagged` \| `rejected` | |
| warnings | JSON | Size-budget and other non-blocking findings |
| isLive | boolean | At most one per model |
| createdById | → D-13 | |
| createdAt, liveAt | timestamp | |

### D-12 AssetFile

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| versionId | → D-11 | |
| tier | `desktop` \| `mobile` \| `poster` | Unique per version |
| url | string | Immutable CDN URL |
| bytes | int | |
| checksum | string | SHA-256 of the stored file |
| contentType | string | `model/gltf-binary`, `video/mp4`, … |

> Reshape note (A-06): the spec's single `Asset` entity (`modelCode, tier, url, bytes, version, checksum`) is split into D-11 + D-12. Every spec field survives; the split adds the live pointer and the check results.

### D-13 AdminUser

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | |
| email | string, unique, lower-cased | |
| name | string | |
| passwordHash | string | BR-38 |
| role | `admin` | A-01 |
| status | `active` \| `disabled` | |
| lastLoginAt | timestamp? | |
| createdAt, updatedAt | timestamp | |

### D-14 CatalogueRevision

The `rulesVersion` counter and its audit trail (A-03). The current version is the highest `version`.

| Field | Type | Notes |
| --- | --- | --- |
| version | int, primary key | Monotonic |
| changedById | → D-13? | Null for seed |
| summary | string | e.g. `price gt-launch-edition/wheel-21-carbon 1200000 → 1250000` |
| createdAt | timestamp | |

### D-15 AdminSession

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| adminId | → D-13, cascade delete | |
| refreshTokenHash | string, unique | SHA-256 of the opaque token |
| previousTokenHash | string? | For reuse detection (F-10) |
| expiresAt | timestamp | 7 days, not extended past an absolute 30-day cap |
| revokedAt | timestamp? | |
| userAgent, ip | string? | Admin audit only |
| createdAt, lastUsedAt | timestamp | |

## 3. Relationships

```
Model 1─* Trim 1─* TrimOption *─1 Option *─1 OptionCategory
Option 1─* OptionRule (subject)   Option 1─* OptionRule (target)
Trim 1─* OptionRule (scoped, optional)
Trim 1─* Build                    Build 1─* Enquiry (optional link)
Enquiry 1─* EnquiryNote *─1 AdminUser
Model 1─* AssetVersion 1─* AssetFile
AdminUser 1─* AdminSession        AdminUser 1─* CatalogueRevision
```

## 4. Invariants

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-01 | All money fields are non-negative integers in EUR cents | Schema types + DTO validation |
| INV-02 | Every trim of a `live` model has, for every required category it offers, at least one option, and exactly one default per single-select category | Catalogue write checks (S-05) + seed test |
| INV-03 | An option is in exactly one category | FK |
| INV-04 | A rule never targets its own subject; `requires` edges form no cycle; a pair is never both `requires` and `excludes` | S-05 |
| INV-05 | `build.totalPrice = basePrice + optionsPrice`, computed by the engine at save time | S-07 |
| INV-06 | A build row is never updated | No update path in code; reviewed in QA (Q-DI-03) |
| INV-07 | An option code used by a build or an asset version is never changed | S-05 |
| INV-08 | At most one `isLive` asset version per model, and only a `verified` one | Partial unique index + S-16 |
| INV-09 | `rulesVersion` only increases, and increases in the same transaction as the change it records | S-05 |
| INV-10 | An enquiry with status `scheduled` is of type `test_drive` | S-09 |
| INV-11 | A non-draft article has `publishedAt` | S-12 |
| INV-12 | Enquiries older than 90 days do not exist after the daily job runs | S-10 |

## 5. Lifecycles and state machines

### Enquiry (BR-22)

| From | To | Allowed when | Triggered by |
| --- | --- | --- | --- |
| — | `new` | Valid submission | Visitor |
| `new` | `contacted` | Always | Admin |
| `new` | `closed` | Always (spam, duplicate) | Admin |
| `contacted` | `scheduled` | `type = test_drive` | Admin |
| `contacted` | `closed` | Always | Admin |
| `scheduled` | `closed` | Always | Admin |
| any | deleted | `createdAt` > 90 days | Retention job |

No transition goes backwards; reopening means a new enquiry.

### Article (BR-26, BR-28)

| From | To | Condition |
| --- | --- | --- |
| — | `draft` / `scheduled` / `published` | On create |
| `draft` | `scheduled` | `publishedAt` in the future |
| `draft` / `scheduled` | `published` | Admin publishes now, or the job reaches `publishedAt` |
| `scheduled` / `published` | `draft` | Admin unpublishes (triggers revalidation) |

### AssetVersion

`pending` → `verified` | `flagged` | `rejected` (by the check). `isLive` may be set only on `verified`. `rejected` versions are kept for audit and never become live.

### AdminSession

`active` → rotated (new hash, previous stored) → `revoked` (logout, reuse detected) or expired.

## 6. Immutability and versioning

| What | Rule |
| --- | --- |
| Build | Immutable snapshot. Prices, selection and `rulesVersion` are copied, never referenced live (BR-16, BR-17). |
| Asset files | Immutable URL per version; never overwritten (BR-32). |
| Option codes | Immutable once referenced (INV-07). |
| Catalogue | Mutable, versioned by `rulesVersion` with a revision row per change (D-14). |
| Enquiry notes | Append-only. |

## 7. Conventions: money, time, identifiers

- **Money:** integer EUR cents everywhere, including JSON (`18950000` = €189,500.00). Formatting is the client's job.
- **Time:** stored as UTC timestamps; transmitted as ISO 8601 with `Z`. `preferredDate` is a calendar date (`YYYY-MM-DD`) with no time zone.
- **Internal IDs:** `cuid` for domain rows; `uuid` for admin users (matches the current code).
- **Public identifiers:** codes and slugs only (model code, trim code, option code, AVERO Code, article slug). Internal IDs appear only on admin routes and as the enquiry reference.
- **Codes:** lowercase kebab for catalogue codes; AVERO Codes upper-case.

## 8. Stable cross-system codes

| Code | Shared with | Change policy |
| --- | --- | --- |
| Option code | Blender (`KHR_materials_variants` names), frontend (contract), saved builds | Never changed once used (INV-07); new codes are added, old ones retired from trims |
| Model code | URLs, asset paths, contract | Never changed after launch |
| Trim code | Builds (snapshotted), contract | Changeable before launch only |
| Category code | Contract | Fixed set in V1 |
| AVERO Code | Visitors, shared links, enquiries | Never changed |

The canonical option-code list is exported to the shared contract package so the 3D pipeline and the frontend use the same strings (see [Phase 6 I-14](phase-6-integration-contracts.md#i-14-blender-export-contract)).

## 9. Personal data inventory

| Data | Entity | Class | Purpose | Retention |
| --- | --- | --- | --- | --- |
| Name, email, phone | D-08 | Personal | Respond to the enquiry (demo) | 90 days |
| Message | D-08 | Personal (free text) | Same | 90 days |
| Preferred date, showroom | D-08 | Low | Test-drive scheduling | 90 days |
| Admin email, name | D-13 | Personal (staff) | Sign-in | Life of the account |
| Admin IP, user agent | D-15 | Personal (staff) | Session audit | Session expiry + 30 days |
| Visitor IP | Rate-limit store | Personal, transient | Abuse protection | Window length (≤ 1 hour) |
| Saved builds | D-07 | Not personal | Sharing | Indefinite |

Visitor IPs are never written to the database. Logs record a truncated or hashed IP only.

## 10. Retention and deletion

| What | Rule | Mechanism |
| --- | --- | --- |
| Enquiries and notes | Delete when `createdAt` < now − 90 days | Daily job (F-16); notes cascade |
| Expired admin sessions | Delete 30 days after `expiresAt` or `revokedAt` | Same daily job |
| Builds | Kept indefinitely | — |
| Rejected asset versions | Kept for audit; files may be removed from storage after 90 days | Manual in V1 |
| Builds linked from deleted enquiries | Kept; the link disappears with the enquiry | Cascade on the enquiry side only |

## 11. Indexes and query patterns

| Query | Index |
| --- | --- |
| Lineup | `Model(sortOrder)` |
| Model by code, trim by code, option by code | Unique on `code` |
| Configurator snapshot for a model | `Trim(modelId)`, `TrimOption(trimId)`, `OptionRule(optionId)`, `OptionRule(targetOptionId)` |
| Build by code | Unique on `code` |
| Admin builds list, popularity window | `Build(createdAt)`, `Build(trimId, createdAt)` |
| Leads list | `Enquiry(status, createdAt)`, `Enquiry(type, createdAt)` |
| Retention | `Enquiry(createdAt)` |
| Public journal | `Article(status, publishedAt)`, `Article(category, status, publishedAt)` |
| Live asset | Partial unique `AssetVersion(modelId) WHERE isLive` |
| Session lookup | Unique `AdminSession(refreshTokenHash)` |

Popular options count elements of `selectedOptionCodes` over a date window. At V1 volumes a grouped `unnest` over the window is enough; add a summary table only if it exceeds 200 ms.

## 12. Migration strategy

- Migrations are committed and reviewed (BR-42). Each runs against the **direct** URL; the app runs on the **pooled** URL.
- The current schema has a `User` table with roles and statuses (see [Phase 8 › Unspecified in code](phase-8-implementation-roadmap.md#unspecified-in-code)). The first catalogue migration either renames it to `AdminUser` (if OD-06 adapts it) or adds `AdminUser` next to it.
- The migration that dropped the old `Model` table (the car-model placeholder) is already in history. The new `Model` (D-01) is created by a new migration; history is never rewritten.
- Destructive changes ship in two steps (add + backfill, then remove) once production holds real data.

## 13. Seed strategy

The seed is idempotent (upsert by code) and loads:

- Models: `gt` (live), `rs` and `x` (teaser).
- One or two GT trims with base prices and full spec sheets.
- Categories: paint, wheels, interior, package.
- Options with codes matching the Blender export, including every code used in spec examples: `paint-obsidian-black`, `paint-titanium-silver`, `paint-ivory-pearl`, `wheel-21-carbon`, `wheel-21-forged-graphite`, `trim-ivory-leather`, `pkg-performance`, `brakes-carbon-ceramic`.
- Rules from the spec: `wheel-21-carbon` requires `pkg-performance`; `trim-ivory-leather` excludes `paint-ivory-pearl`; `pkg-performance` includes `brakes-carbon-ceramic`; default paint `paint-obsidian-black`.
- `CatalogueRevision` version 1.
- One admin from env-provided credentials (never a hard-coded password in production).
- Three journal articles (V1 launch content), one per category.
- Optional demo enquiries and builds behind a flag, for local work only.

## 14. Reference schema

A starting point, extending the spec's sketch. Adjust during Phase 1 of the roadmap.

```prisma
enum ModelStatus { live teaser }
enum SelectionMode { single multi }
enum RuleType { requires excludes includes default }
enum EnquiryType { general vehicle test_drive }
enum EnquiryStatus { new contacted scheduled closed }
enum Showroom { lisbon_atelier milan_studio munich_gallery }
enum ArticleCategory { design engineering announcements }
enum ArticleStatus { draft scheduled published }
enum AssetTier { desktop mobile poster }
enum AssetStatus { pending verified flagged rejected }
enum AdminRole { admin }
enum AdminStatus { active disabled }

model Model {
  id        String      @id @default(cuid())
  code      String      @unique
  name      String
  tagline   String?
  status    ModelStatus @default(teaser)
  sortOrder Int         @default(0)
  trims     Trim[]
  assets    AssetVersion[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  @@index([sortOrder])
}

model Trim {
  id        String       @id @default(cuid())
  code      String       @unique
  model     Model        @relation(fields: [modelId], references: [id])
  modelId   String
  name      String
  basePrice Int
  specs     Json
  sortOrder Int          @default(0)
  options   TrimOption[]
  rules     OptionRule[]
  builds    Build[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  @@index([modelId])
}

model OptionCategory {
  id        String        @id @default(cuid())
  code      String        @unique
  name      String
  selection SelectionMode
  required  Boolean       @default(false)
  sortOrder Int           @default(0)
  options   Option[]
}

model Option {
  id           String         @id @default(cuid())
  code         String         @unique
  category     OptionCategory @relation(fields: [categoryId], references: [id])
  categoryId   String
  name         String
  description  String?
  swatchHex    String?
  thumbnailUrl String?
  isDefault    Boolean        @default(false)
  sortOrder    Int            @default(0)
  trims        TrimOption[]
  rulesAsSubject OptionRule[] @relation("ruleSubject")
  rulesAsTarget  OptionRule[] @relation("ruleTarget")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model TrimOption {
  trim     Trim   @relation(fields: [trimId], references: [id], onDelete: Cascade)
  trimId   String
  option   Option @relation(fields: [optionId], references: [id])
  optionId String
  price    Int
  @@id([trimId, optionId])
}

model OptionRule {
  id             String   @id @default(cuid())
  type           RuleType
  option         Option   @relation("ruleSubject", fields: [optionId], references: [id])
  optionId       String
  targetOption   Option?  @relation("ruleTarget", fields: [targetOptionId], references: [id])
  targetOptionId String?
  trim           Trim?    @relation(fields: [trimId], references: [id])
  trimId         String?
  message        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([type, optionId, targetOptionId, trimId])
  @@index([optionId])
  @@index([targetOptionId])
}

model CatalogueRevision {
  version     Int        @id
  changedBy   AdminUser? @relation(fields: [changedById], references: [id])
  changedById String?
  summary     String
  createdAt   DateTime   @default(now())
}

model Build {
  id                  String    @id @default(cuid())
  code                String    @unique
  trim                Trim      @relation(fields: [trimId], references: [id])
  trimId              String
  trimCode            String
  selectedOptionCodes String[]
  includedOptionCodes String[]
  basePrice           Int
  optionsPrice        Int
  totalPrice          Int
  currency            String    @default("EUR")
  rulesVersion        Int
  enquiries           Enquiry[]
  createdAt           DateTime  @default(now())
  @@index([createdAt])
  @@index([trimId, createdAt])
}

model Enquiry {
  id            String        @id @default(cuid())
  type          EnquiryType
  name          String
  email         String
  phone         String?
  message       String
  build         Build?        @relation(fields: [buildId], references: [id])
  buildId       String?
  preferredDate DateTime?     @db.Date
  showroom      Showroom?
  consent       Boolean
  consentAt     DateTime
  status        EnquiryStatus @default(new)
  notes         EnquiryNote[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  @@index([status, createdAt])
  @@index([type, createdAt])
  @@index([createdAt])
}

model EnquiryNote {
  id        String    @id @default(cuid())
  enquiry   Enquiry   @relation(fields: [enquiryId], references: [id], onDelete: Cascade)
  enquiryId String
  author    AdminUser @relation(fields: [authorId], references: [id])
  authorId  String
  body      String
  createdAt DateTime  @default(now())
}

model Article {
  id              String          @id @default(cuid())
  slug            String          @unique
  title           String
  excerpt         String
  category        ArticleCategory
  coverImageUrl   String
  body            Json
  authorName      String
  status          ArticleStatus   @default(draft)
  publishedAt     DateTime?
  metaTitle       String?
  metaDescription String?
  ogImageUrl      String?
  revalidatedAt   DateTime?
  createdById     String
  updatedById     String
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  @@index([status, publishedAt])
  @@index([category, status, publishedAt])
}

model AssetVersion {
  id             String      @id @default(cuid())
  model          Model       @relation(fields: [modelId], references: [id])
  modelId        String
  version        String
  environmentUrl String
  variants       String[]
  missingCodes   String[]
  extraVariants  String[]
  status         AssetStatus @default(pending)
  warnings       Json        @default("[]")
  isLive         Boolean     @default(false)
  files          AssetFile[]
  createdById    String
  createdAt      DateTime    @default(now())
  liveAt         DateTime?
  @@unique([modelId, version])
  // plus a partial unique index on (modelId) WHERE "isLive", added in raw SQL in the migration
}

model AssetFile {
  id          String       @id @default(cuid())
  version     AssetVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  versionId   String
  tier        AssetTier
  url         String
  bytes       Int
  checksum    String
  contentType String
  @@unique([versionId, tier])
}

model AdminUser {
  id           String       @id @default(uuid())
  email        String       @unique
  name         String
  passwordHash String
  role         AdminRole    @default(admin)
  status       AdminStatus  @default(active)
  lastLoginAt  DateTime?
  sessions     AdminSession[]
  notes        EnquiryNote[]
  revisions    CatalogueRevision[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model AdminSession {
  id                String    @id @default(cuid())
  admin             AdminUser @relation(fields: [adminId], references: [id], onDelete: Cascade)
  adminId           String
  refreshTokenHash  String    @unique
  previousTokenHash String?
  expiresAt         DateTime
  absoluteExpiresAt DateTime
  revokedAt         DateTime?
  userAgent         String?
  ip                String?
  createdAt         DateTime  @default(now())
  lastUsedAt        DateTime  @default(now())
  @@index([adminId])
}
```

Showroom values are placeholders for the fixed fictional list; the final names come from the master brief.

## 15. Future expansion

- `editor` role (A-01) — add an enum value; no table change.
- Per-trim rules versions — add `rulesVersion` to Trim and keep the global one for ETags.
- Build posters — add `posterUrl` to Build (post-V1, BR-17 still holds: the poster is derived, not an edit).
- Locales — translation tables keyed by code for names and messages.
