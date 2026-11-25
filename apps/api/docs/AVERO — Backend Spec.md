# AVERO — Backend Spec

Nov 22, 2026 · Cage4D

The backend powers the AVERO configurator, saved builds, enquiries, journal and 3D asset delivery for Version 1. Read it alongside AVERO — Master Brief v2.

## Your scope

You own everything that stores, decides or serves. Cage owns everything the visitor sees, including all 3D. The shared data contract is co-owned.

**Backend owns**

- The vehicle catalogue: models, trims, option categories, options, prices, specs
- The configuration rules engine: which options are compatible, required or exclusive, and the live price
- Saved and shareable builds (AVERO Codes)
- Enquiry and test-drive request intake, with an admin dashboard to manage them
- Journal articles and their media
- 3D asset delivery: GLB and texture hosting, versioning, device-tier manifests
- Database, admin authentication, environments, deployment, monitoring
- The OpenAPI schema that the frontend generates its types from

**Backend does not own**

- Page rendering, animation, the 3D viewer or the configurator UI
- Blender models and material setup (but you validate that exported variant names match option IDs)
- Visitor accounts. Version 1 has none; only admins sign in.

**Why this is a real backend project.** The rules engine, shareable state and asset versioning are the same problems real manufacturer configurators solve. Build them properly and this is a strong portfolio piece for you too.

## Recommended stack

The recommended default is NestJS, PostgreSQL and Prisma, with Zod or class-validator for input validation and an OpenAPI schema generated from the code. Cage already works in this stack, so reviews and debugging can be shared. This stack is confirmed.

| Concern | Recommendation | Note |
| --- | --- | --- |
| API framework | NestJS (TypeScript) | Modules map cleanly to catalogue, builds, enquiries, journal, assets |
| Database | PostgreSQL | Relational data with rules; JSONB for flexible spec sheets |
| ORM and migrations | Prisma | Typed client, versioned migrations, seed scripts |
| Validation | Zod or class-validator | Validate every request body and query |
| API schema | OpenAPI via `@nestjs/swagger` | Frontend generates types from it |
| Admin auth | Email and password with hashed passwords, session cookie or short-lived JWT | Admins only in V1 |
| File and asset storage | Vercel Blob (served from Vercel's CDN) | GLBs, textures, journal images |
| Caching | HTTP cache headers first; Redis only if needed | Catalogue reads are almost static |
| Email | Transactional email provider for enquiry notifications | Optional in V1 |
| Hosting | Vercel: NestJS as a Vercel Function, Postgres from the Vercel Marketplace | Confirmed; see Hosting on Vercel below |
| Testing | Jest for unit, Supertest for endpoints | Rules engine needs the most tests |

Keep the API stateless and versioned under `/api/v1`.

### Hosting on Vercel

The API, database and file storage all run on Vercel, in a separate Vercel project from the frontend. Vercel detects NestJS automatically and runs it as a single Vercel Function, so no server management is needed. That brings four constraints to design for from day one:

- **Database:** Vercel no longer offers its own Postgres. Add Neon or Prisma Postgres from the Vercel Marketplace and connect Prisma through the **pooled** connection string; serverless functions open many connections, and pooling keeps Postgres from running out. Run migrations against the direct (non-pooled) URL.
- **4.5 MB request limit:** Vercel Functions reject request bodies over 4.5 MB. Journal images can pass through the API, but GLB files cannot. Upload those straight from the browser to Vercel Blob (see 3D asset delivery).
- **No background process:** a function only runs while handling a request. Scheduled work, like deleting old enquiries, runs as a Vercel Cron job that calls a protected endpoint.
- **Stateless:** keep nothing in memory between requests. Rate-limit counters need a store (Upstash Redis from the Marketplace) or Vercel Firewall rate-limiting rules.

Use custom domains on the same parent domain (for example `avero.example` and `api.avero.example`) so admin session cookies work across both projects.

## Architecture

One NestJS API sits between every client and the data. The only exception is 3D assets: the browser downloads GLBs and textures straight from the CDN, using URLs the API hands it in an asset manifest.

&#91;embedded content: backend architecture · V1\]

Public endpoints are read-heavy and cacheable; the only public writes are saved builds and enquiries. Everything else needs an admin session.

**Suggested NestJS modules:** `catalogue`, `configurator` (rules + pricing), `builds`, `enquiries`, `journal`, `assets`, `admin-auth`, `health`.

## Data model

A model has trims. A trim offers options, which are grouped into categories (paint, wheels, interior, packages). Rules restrict how options combine. Every option's `code` is the stable ID shared with Blender: for example, `paint-obsidian-black` is both the database code and the glTF material variant name.

| Entity | Key fields | Notes |
| --- | --- | --- |
| `Model` | `code` (`gt`), `name`, `tagline`, `status` (`live`, `teaser`), `sortOrder` | RS and X exist as `teaser` |
| `Trim` | `code`, `modelId`, `name`, `basePrice`, `specs` (JSONB) | V1: one or two GT trims |
| `OptionCategory` | `code` (`paint`, `wheels`, `interior`, `package`), `name`, `selection` (`single`, `multi`), `required` | Paint and wheels are single and required |
| `Option` | `code`, `categoryId`, `name`, `description`, `swatchHex`, `thumbnailUrl`, `isDefault` | `code` = Blender variant name |
| `TrimOption` | `trimId`, `optionId`, `price` | Price can differ by trim |
| `OptionRule` | `type`, `optionId`, `targetOptionId`, `message` | See the rules section |
| `Build` | `code` (AVERO Code), `trimId`, `selectedOptionCodes[]`, `totalPrice`, `rulesVersion`, `createdAt` | Immutable once saved |
| `Enquiry` | `type` (`general`, `vehicle`, `test_drive`), name, email, phone?, message, `buildId`?, `preferredDate`?, `status`, `consent` | Demo data only |
| `Article` | `slug`, `title`, `excerpt`, `body` (MDX or rich JSON), `category`, `coverImageUrl`, `status`, `publishedAt` | Journal |
| `Asset` | `modelCode`, `tier` (`desktop`, `mobile`, `poster`), `url`, `bytes`, `version`, `checksum` | 3D delivery |
| `AdminUser` | `email`, `passwordHash`, `role` | Admins only |

A schema sketch to start from (adjust freely):

```prisma
model Model {
  id        String  @id @default(cuid())
  code      String  @unique
  name      String
  tagline   String?
  status    ModelStatus @default(teaser)
  sortOrder Int     @default(0)
  trims     Trim[]
}

model Trim {
  id        String  @id @default(cuid())
  code      String  @unique
  model     Model   @relation(fields: [modelId], references: [id])
  modelId   String
  name      String
  basePrice Int     // minor units (cents) to avoid float errors
  specs     Json
  options   TrimOption[]
}

model Option {
  id          String  @id @default(cuid())
  code        String  @unique // must match the Blender variant name
  category    OptionCategory @relation(fields: [categoryId], references: [id])
  categoryId  String
  name        String
  swatchHex   String?
  isDefault   Boolean @default(false)
  trims       TrimOption[]
}

model TrimOption {
  trim     Trim   @relation(fields: [trimId], references: [id])
  trimId   String
  option   Option @relation(fields: [optionId], references: [id])
  optionId String
  price    Int
  @@id([trimId, optionId])
}

enum ModelStatus { live teaser }
```

Store money as integers in minor units, in EUR, the only currency in V1.

## Configuration rules and pricing

The server is the source of truth: it validates every configuration and calculates the price. The frontend may predict results so the UI feels instant, but it always trusts the server's answer.

| Rule type | Meaning | Example |
| --- | --- | --- |
| `requires` | Choosing A needs B | `wheel-21-carbon` requires `pkg-performance` |
| `excludes` | A and B cannot both be chosen | `trim-ivory-leather` excludes `paint-ivory-pearl` |
| `includes` | A adds B at no extra cost | `pkg-performance` includes `brakes-carbon-ceramic` |
| `default` | Option chosen when nothing else is | `paint-obsidian-black` |
| `single` (category) | Exactly one from the category | One paint, one wheel |

**How validation works**

1. Start from the trim's defaults, then apply the visitor's selections.
2. For single-select categories, a new choice replaces the old one.
3. Apply `includes`, then check `requires` and `excludes`.
4. Return either a valid configuration or a list of conflicts, each with a human message and a suggested fix (for example, "Carbon wheels need the Performance Package. Add it for €8,400?").
5. Price = trim base price + the sum of chosen option prices, with included options at zero.

**Response shape** for `POST /configurator/validate`:

```json
{
  "trim": "gt-launch-edition",
  "valid": false,
  "selected": ["paint-obsidian-black", "wheel-21-carbon", "trim-ivory-leather"],
  "included": [],
  "conflicts": [
    {
      "type": "requires",
      "option": "wheel-21-carbon",
      "needs": "pkg-performance",
      "message": "Carbon wheels need the Performance Package.",
      "fix": { "add": ["pkg-performance"] }
    }
  ],
  "price": { "base": 18950000, "options": 1200000, "total": 20150000, "currency": "EUR" },
  "rulesVersion": 3
}
```

Write the rules engine as a pure function with no database calls inside, so it is easy to unit test. It needs the most tests in the codebase.

## API endpoints

All routes live under `/api/v1`. Public routes are read-only apart from saving builds and submitting enquiries. Admin routes need a valid admin session.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/models` | Public | Lineup, including teasers |
| GET | `/models/:code` | Public | Model detail, trims, specs |
| GET | `/models/:code/configurator` | Public | Trims, categories, options, prices, rules, defaults: everything the configurator needs in one call |
| POST | `/configurator/validate` | Public | Validate a selection and return price and conflicts |
| POST | `/builds` | Public, rate-limited | Save a valid configuration; returns an AVERO Code |
| GET | `/builds/:code` | Public | Restore a saved build |
| GET | `/models/:code/assets` | Public | Asset manifest by device tier |
| POST | `/enquiries` | Public, rate-limited | General, vehicle or test-drive request |
| GET | `/articles` | Public | Published journal list, paginated, filterable by category |
| GET | `/articles/:slug` | Public | One article |
| POST | `/admin/auth/login` | Public | Admin sign-in |
| POST | `/admin/auth/logout` | Admin | Sign out |
| GET, PATCH | `/admin/enquiries`, `/admin/enquiries/:id` | Admin | List, filter, change status, add notes |
| GET | `/admin/builds` | Admin | Browse saved builds and popular options |
| CRUD | `/admin/articles` | Admin | Write and publish journal articles |
| CRUD | `/admin/catalogue/*` | Admin | Edit models, trims, options, prices, rules |
| POST | `/admin/assets` | Admin | Register a new asset version |
| GET | `/health` | Public | Uptime check |

**Conventions:** JSON only; errors return `{ "error": { "code", "message", "details"? } }`; lists use cursor pagination; catalogue GETs send `Cache-Control` and `ETag` headers. Publish the OpenAPI document at `/api/v1/docs` so the frontend can generate types from it.

## Saved builds (AVERO Code)

A saved build is an immutable snapshot that anyone can reopen at `/build/[code]` using an 8-character AVERO Code, for example `AV-7KQ2M9XD`.

- **Code format:** `AV-` plus 8 characters from an alphabet without lookalikes (no 0, O, 1, I, L). Generate it randomly and retry on collision; don't derive it from a sequential ID.
- **Validate before saving:** `POST /builds` runs the rules engine and rejects invalid configurations.
- **Snapshot the price.** Store `totalPrice` and `rulesVersion` with the build. If prices or rules change later, the build still opens and shows its original price, with a flag such as `"outdated": true` so the UI can offer to update it.
- **Never edit a build.** A change creates a new code.
- **Abuse protection:** rate-limit by IP (for example, 20 saves per hour) and require a valid configuration.
- **Optional:** `POST /builds/:code/poster` creates a share image later; not V1.

An enquiry can reference a build, so a test-drive request arrives with the exact car the visitor configured.

## Enquiries, test drives and admin dashboard

Visitors can send a general enquiry, ask about a vehicle, or request a test drive. Staff manage these leads in a small admin dashboard. Because AVERO is fictional, every form says submissions are a demo, and nobody is contacted automatically except optional admin alerts.

**Enquiry rules**

- Required: type, name, email, message, and a consent checkbox. Optional: phone, build code, preferred date, and preferred location (pick from a fixed list of fictional showrooms).
- Validate everything on the server; reject unknown fields.
- Spam protection: a honeypot field, IP rate limiting, and an optional free CAPTCHA such as Cloudflare Turnstile.
- Status flow: `new` → `contacted` → `scheduled` (test drives only) → `closed`.
- Retention: delete demo enquiries after 90 days with a daily Vercel Cron job, and say so in the privacy note.

**Admin dashboard (V1)**

| View | What it shows |
| --- | --- |
| Leads | Filterable table: type, status, date, linked build; open a lead to read it, change its status and add notes |
| Builds | Recent saved builds and the most popular paint and wheel choices |
| Journal | Write, preview, schedule and publish articles |
| Catalogue | Edit prices, option names and rules without a deploy |
| Assets | Register new GLB versions and switch the live version |

**Decision:** the dashboard lives in the Next.js app under `/admin`, and you build it. It uses a plain component kit (shadcn/ui) on the shared design tokens, so it looks like AVERO without needing the public site's polish. One app means one domain for the session cookie and shared types. Cage's time stays on the visitor experience, and you get full-stack work for your portfolio. Keep `/admin` out of the public bundle (its own route group), mark it `noindex`, and protect it with middleware that checks the admin session.

## Journal content

The journal is served by the API, so the editorial side is part of the backend portfolio rather than a third-party CMS. V1 launches with three articles.

- **Fields:** slug, title, excerpt, category (`design`, `engineering`, `announcements`), cover image, body, author name, status (`draft`, `scheduled`, `published`), `publishedAt`.
- **Body format:** structured rich-text JSON (TipTap/ProseMirror format), written in the admin with a WYSIWYG editor and stored in Postgres. The frontend maps each node type to a branded component: paragraph, heading, pull quote, full-bleed image, spec callout. This beats MDX here because MDX is code: compiling it from the database on each request is slow on serverless and lets anyone with admin access inject JavaScript.
- **Images:** uploaded through the admin, stored in object storage, and served via the CDN with width variants.
- **Publishing:** scheduled articles go live at `publishedAt`; drafts are never returned by public routes.
- **SEO:** each article returns `metaTitle`, `metaDescription` and `ogImageUrl`.
- **Revalidation:** after publishing, call a Next.js revalidation webhook so the page updates without a redeploy.

If time is short, a headless CMS (Payload or Sanity) is an acceptable fallback. The public API shape stays the same.

## 3D asset delivery

Cage exports optimised GLBs from Blender; the backend stores, versions and serves them. The browser asks the API which files to load, then downloads them straight from the CDN.

**Manifest** returned by `GET /models/gt/assets`:

```json
{
  "model": "gt",
  "version": "2027.01.3",
  "tiers": {
    "desktop": { "url": "https://cdn.avero.example/gt/2027.01.3/gt-desktop.glb", "bytes": 13800000 },
    "mobile":  { "url": "https://cdn.avero.example/gt/2027.01.3/gt-mobile.glb",  "bytes": 5400000 },
    "poster":  { "url": "https://cdn.avero.example/gt/2027.01.3/gt-poster.mp4",  "bytes": 2600000 }
  },
  "environment": "https://cdn.avero.example/env/studio-2k.hdr",
  "variants": ["paint-obsidian-black", "paint-titanium-silver", "wheel-21-forged-graphite"]
}
```

**Requirements**

- **Immutable, versioned URLs.** Each upload goes to a new version folder, served with `Cache-Control: public, max-age=31536000, immutable`. Switching versions means updating the manifest, never overwriting files.
- **CORS** on the bucket so the frontend domain can fetch GLB, KTX2 and HDR files.
- **Correct content types:** `model/gltf-binary` for `.glb`, `image/ktx2` for `.ktx2`.
- **Variant check on upload:** read the GLB's `KHR_materials_variants` names and compare them with the option codes in the database. Reject the upload, or flag it in the admin, if any option has no matching variant. This one check stops most Blender-to-web bugs.
- **Size limits:** warn above the budgets in the master brief (desktop 15 MB, mobile 6 MB).
- **Rollback:** the previous version stays live-switchable from the admin.

The `gltf-transform` library can read GLB metadata in Node, so the variant check can run inside the API.

**Uploading GLBs:** a desktop GLB is well over Vercel's 4.5 MB request limit, so it never passes through the API. The admin uploads it from the browser straight to Vercel Blob as a client upload. The API only issues the scoped upload token, then registers the new version and runs the variant check on the stored file.

## Security, validation, testing and conventions

The public API accepts only two kinds of write, saved builds and enquiries, so most of the security work goes into those two endpoints and into admin auth.

**Security**

- Hash admin passwords with argon2 or bcrypt. Use httpOnly, secure, SameSite cookies, or short-lived JWTs with refresh.
- Rate-limit `POST /builds`, `POST /enquiries` and `/admin/auth/login` (for example with `@nestjs/throttler`).
- Restrict CORS to the frontend domains. Set security headers (Helmet).
- Keep secrets in environment variables; commit only `.env.example`.
- Store only the personal data an enquiry needs, and delete it on the retention schedule.

**Validation:** every body, query and param goes through a schema. Reject unknown fields. Never trust prices or totals sent by the client.

**Testing**

| Layer | Focus |
| --- | --- |
| Unit | Rules engine: every rule type, combinations, price totals, edge cases |
| Integration | Endpoints against a test Postgres (Docker or Testcontainers) |
| Contract | OpenAPI schema generated in CI; fail the build on breaking changes |
| Seed | A script that loads the GT catalogue so both of you can run the app locally |

**Conventions**

- Monorepo recommended: `apps/web` (Cage), `apps/api` (you), `packages/contract` (generated types and shared option codes).
- Prisma migrations are committed and reviewed; never edit the production schema by hand.
- Branch per feature, pull request with review from the other person for anything touching the data contract.
- Environments: `local`, `staging`, `production`.
- Basic monitoring: the health endpoint, structured logs, and error tracking (Sentry has a free tier).

## Milestones and open questions

The backend lane follows the four phases in the master brief. Dates are proposals to agree together.

**Phase 0 · Spike (Nov 23 to Dec 6)**

- [ ] Monorepo, NestJS app, Postgres and Prisma running locally
- [ ] First draft of the data model and the shared option-code list
- [ ] `GET /models/:code` returns the GT from seeded data
- [ ] OpenAPI document published and types generated on the frontend

**Phase 1 · Define (Dec 7 to Jan 3)**

- [ ] Data contract signed off with Cage
- [ ] Full schema, migrations and GT seed data
- [ ] Catalogue and configurator-data endpoints
- [ ] Admin auth

**Phase 2 · Build (Jan 4 to Feb 28)**

- [ ] Rules engine and pricing, with unit tests
- [ ] Saved builds (AVERO Codes)
- [ ] Enquiries with spam protection and retention job
- [ ] Journal endpoints, image upload and revalidation webhook

**Phase 3 · Launch (Mar 1 to Mar 28)**

- [ ] Object storage, CDN, asset manifest and variant check
- [ ] Admin endpoints for leads, builds, catalogue and assets
- [ ] Staging and production deployed, monitoring on
- [ ] Load test of the public endpoints

**Decisions (agreed Nov 22, 2026)**

| Question | Decision |
| --- | --- |
| Stack | NestJS, PostgreSQL, Prisma |
| Hosting | Vercel for the API, Marketplace Postgres (Neon or Prisma Postgres), Vercel Blob for files |
| Journal body | Rich-text JSON (TipTap), not MDX |
| Admin dashboard | Next.js `/admin`, built by the backend developer with shadcn/ui on the brand tokens |
| Currency | EUR |
| Credits | Footer: "AVERO is a fictional concept by Cage4D and \[your handle\]." README: a Credits section with each person's role and GitHub link |
