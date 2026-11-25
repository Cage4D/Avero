# IMPLEMENTATION PROMPT — AVERO Backend V1

> v1.0 · generated 2026-11-24 · synthesises Phases 1–9 of the AVERO Backend OS
> Entry: [START_HERE](START_HERE.md) · Index: [BACKEND-OS-COMPLETE](BACKEND-OS-COMPLETE.md) · Setup: [SETUP-CHECKLIST](SETUP-CHECKLIST.md)

## Table of contents

1. [Overview](#1-overview)
2. [Required reading](#2-required-reading)
3. [Contract hand-off](#3-contract-hand-off)
4. [Working rules](#4-working-rules)
5. [Architecture to build](#5-architecture-to-build)
6. [Sprint by sprint](#6-sprint-by-sprint)
7. [Code patterns](#7-code-patterns)
8. [Testing strategy](#8-testing-strategy)
9. [Pre-launch QA by category](#9-pre-launch-qa-by-category)
10. [Pre-merge checklist](#10-pre-merge-checklist)
11. [Deployment readiness](#11-deployment-readiness)
12. [References](#12-references)

---

## 1. Overview

**What this prompt does.** It turns the AVERO Backend OS into build instructions: what to create, in what order, following which patterns, verified by which checks.

**How to use it.** Start a session, paste this file or point to it, and name one sprint from §6. Build only that sprint. When done, update the [Phase 8 status register](phase-8-implementation-roadmap.md#5-status-register) and tick the matching [Phase 9](phase-9-qa-checklist.md) items.

**What you are building.** The AVERO V1 API in `apps/api`: NestJS 12 (ESM), Prisma 7 on Postgres, deployed as a Vercel Function, with Vercel Blob for files. It serves the catalogue and configurator, validates and prices configurations, saves AVERO Codes, takes enquiries, serves the journal and 3D asset manifests, and powers the admin area.

## 2. Required reading

Read before writing code. Each phase is the only home for its kind of fact; cite IDs, never restate shapes.

| Phase | Read for | Must-know sections |
| --- | --- | --- |
| [1 — Service Vision](phase-1-service-vision.md) | Rules and decisions | §7 BR-01–BR-42 · §14 assumptions A-01–A-10 · §15 open decisions OD-01–OD-06 |
| [2 — Flow Maps](phase-2-flow-maps.md) | Step-by-step server behaviour | F-04, F-05, F-10, F-14, F-15 · cross-flow guarantees |
| [3 — Domain Model](phase-3-domain-model.md) | Tables, invariants, lifecycles | §2 entities · §4 INV-01–INV-12 · §5 state machines · §14 schema |
| [4 — API Surface](phase-4-api-surface.md) | Every shape and error | §1 conventions · §2 error catalogue · §3 index |
| [5 — Service Blueprints](phase-5-service-blueprints.md) | Algorithms | S-01 + worked examples · S-05 · S-06 · S-16 · S-18 · S-19 |
| [6 — Integration Contracts](phase-6-integration-contracts.md) | Edges | I-01, I-02, I-03, I-08, I-14 |

Then the host conventions in [`apps/api/CLAUDE.md`](../../CLAUDE.md). They win over anything here.

## 3. Contract hand-off

This backend OS defines what the API stores, decides and serves. Request and response shapes are fixed in Phase 4. Before changing any shape, update Phase 4, regenerate the contract and tell the frontend owner. The server is the source of truth for every rule and every number; never trust a value the client computed.

## 4. Working rules

1. **Host conventions first:** one job per file, Controller → Service → Repo → Prisma, Prisma only in `src/common/repos/`, no `console.*`, relative `.js` imports, no hardcoding, no dead code.
2. **Pure logic in `src/lib/`.** The rules engine, pricing, code generator, GLB inspector, enquiry transitions, TipTap validator and ETag recipes have no Nest imports and no I/O.
3. **Dependencies need approval.** Reuse what is installed (bcrypt, `@nestjs/jwt`, passport-jwt, class-validator, zod, helmet, swagger). For anything new, propose the package and the reason, then wait. Never hand-edit `package.json`. The current list to propose is in [Phase 7 §20](phase-7-backend-architecture.md#20-dependencies-to-propose).
4. **Scope is preserved.** Do not delete a specified feature because it is not built. Do not promote unrequested code into the spec. Code to retire is decided by the maintainer (OD-06).
5. **Open decisions block their sprint.** If a sprint needs an OD that is not decided, stop and ask; do not pick silently.
6. **Heavy jobs one at a time.** Typecheck, test, build and contract generation run sequentially, after checking machine load.
7. **Schema changes ship with a migration.** Never edit the production schema by hand. Production migrations need explicit confirmation.

## 5. Architecture to build

The full tree is in [Phase 7 §2](phase-7-backend-architecture.md#2-folder-structure). Summary:

```
src/
├── common/
│   ├── config/        env.validation.ts (+ variables per sprint), jwt-keys.ts
│   ├── database/      prisma.module.ts, prisma.service.ts
│   ├── repos/         catalogue, build, enquiry, article, asset, admin-user, admin-session, catalogue-revision
│   ├── errors/        app.exception.ts, repo.error.ts, error-map.ts
│   ├── enums/         error-codes.ts, rate-limits.ts, cache.ts, auth.ts, assets.ts, enquiries.ts
│   ├── filters/       http-exception.filter.ts (spec envelope), all-exceptions.filter.ts
│   ├── interceptors/  response.interceptor.ts, cache-headers.interceptor.ts
│   ├── guards/        cron-secret.guard.ts, origin.guard.ts, throttle.guard.ts
│   ├── middleware/    request-id.middleware.ts
│   ├── decorators/    api-envelope, api-errors, cache-class, rate-limit
│   └── dto/           api-envelope, api-error, cursor-page
├── lib/               rules-engine/, avero-code.ts, glb.ts, enquiry-status.ts, tiptap.ts, cursor.ts, etag.ts, period.ts
└── modules/core/      admin-auth, catalogue, configurator, builds, enquiries, journal, media, assets, jobs, health
```

**Request pipeline** ([Phase 7 §5](phase-7-backend-architecture.md#5-request-pipeline)): helmet → CORS → cookies → request ID → prefix `api/v1` → guards (throttle → cron secret → JWT cookie → roles → origin) → `ValidationPipe` with `exceptionFactory` → controller → cache headers → success envelope → filters.

**Module dependencies** ([Phase 7 §3](phase-7-backend-architecture.md#3-module-map)): `configurator` ← `builds` ← `enquiries`; `catalogue` ← `assets`; `enquiries`, `journal` ← `jobs`. Never the reverse.

**Environment** ([Phase 7 §6](phase-7-backend-architecture.md#6-configuration-and-environment)): add variables to the zod schema and `.env.example` in the sprint that first needs them.

## 6. Sprint by sprint

Each sprint lists what to build, the IDs it implements, its dependencies, and its exit checks. Dates are the spec's proposals ([Phase 8 §1](phase-8-implementation-roadmap.md#1-timeline)).

### Sprint 0 · Spike · Nov 23 – Dec 6

**Goal:** `GET /api/v1/models/gt` returns the GT from seeded data; the frontend generates types for it.

Build:

1. **Error envelope** (R-01, R-02): `AppException`, `common/enums/error-codes.ts` with the [Phase 4 catalogue](phase-4-api-surface.md#2-error-catalogue), reshape `HttpExceptionFilter` to `{ error: { code, message, details? } }`, add `AllExceptionsFilter`, `ValidationPipe` `exceptionFactory` → `VALIDATION_FAILED` with `details.fields`. Update the health e2e test for the new error shape where it asserts errors.
2. **Catalogue schema:** D-01–D-06 and D-14 from the [reference schema](phase-3-domain-model.md#14-reference-schema). New migration on top of history.
3. **Seed:** GT catalogue per [Phase 3 §13](phase-3-domain-model.md#13-seed-strategy), revision 1. Keep the existing admin seeding until Sprint 2.
4. **E-02** through `catalogue` module: `CatalogueController.findModel`, `CatalogueService` (S-04), `catalogue.repo.ts`.
5. **Code list draft:** export option and category codes from the contract package (I-14).
6. `APP_ENV` in env validation.

Depends on: nothing. Exit: Q-ER-01 (sample), Q-DI-11, Q-DI-12; `contract:generate` clean.

### Sprint 1 · Define · Dec 7 – Dec 20

Build:

1. **Contract sign-off** on Phase 4 with the frontend owner.
2. **Full schema** D-07–D-15 and migrations; complete seed (three articles, demo flags).
3. **E-01, E-03** with S-03 (snapshot, repeatable read, `rulesVersion`) and S-23 (`CacheHeadersInterceptor`, `lib/etag.ts`, `@CacheClass`).
4. **CI** (propose the workflow and the OpenAPI diff tool): install → typecheck → lint → test → `contract:generate` + `git diff --exit-code` → breaking-change diff.
5. **OD-06** decided; act on it (retire or adapt `/auth/register`, `/users`, `/stats`).

Depends on: Sprint 0. Exit: Q-CA-01, Q-CA-02, Q-CA-03, Q-CT-01–Q-CT-03, Q-PF-03, Q-RE-20 (E-03 part).

### Sprint 2 · Define · Dec 21 – Jan 3

Build:

1. **admin-auth** (evolve `modules/core/auth/`; R-03–R-07, R-10, R-11):
   - `AdminUser` (D-13) replacing or renaming `User` per OD-06; `AdminSession` (D-15).
   - E-12 login, E-13 logout, E-14 refresh, E-15 me — algorithms in [S-18](phase-5-service-blueprints.md#s-18-admin-auth); cookies per [I-02](phase-6-integration-contracts.md#i-02-admin-session-cookies).
   - JWT extractor from cookie; bearer only with `BEARER_AUTH_ENABLED`.
   - Access TTL 15 min from env (replaces `JWT_EXPIRES_IN = '7d'`).
   - Seed admin from `SEED_ADMIN_*`; refuse defaults in production.
2. **OriginGuard** for admin writes; cookie parsing (propose dependency).
3. **E-08** completed: database check with 1 s timeout, version, `degraded` → 503 (S-22).
4. Test cookies across `localhost` ports; verify in staging as soon as a staging domain exists.

Depends on: Sprint 1 schema. Exit: Q-AZ-01–Q-AZ-06, Q-AZ-08–Q-AZ-10, Q-SE-02, Q-SE-03, Q-SE-09, Q-OB-05, Q-OP-07.

### Sprint 3 · Build · Jan 4 – Jan 17

Build:

1. **Rules engine** `lib/rules-engine/` — [S-01 algorithm](phase-5-service-blueprints.md#s-01-rules-engine), steps 1–8, exactly. Write the six worked examples as tests **first**.
2. **Pricing** `lib/rules-engine/pricing.ts` — [S-02](phase-5-service-blueprints.md#s-02-pricing).
3. **E-09** `POST /configurator/validate` in `configurator` module: snapshot (S-03) → engine → response per [E-09](phase-4-api-surface.md#e-09-post-configuratorvalidate).
4. **OD-01** decided; rate limiting (S-19): decorator, policies in `common/enums/rate-limits.ts`, guard, store client (propose dependencies); E-09 limit.

Depends on: Sprint 1 (S-03). Exit: Q-RE-01–Q-RE-19, Q-PF-01, Q-SE-04 (E-09), Q-SE-05, Q-RL-03.

### Sprint 4 · Build · Jan 18 – Jan 31

Build:

1. **AVERO Code generator** `lib/avero-code.ts` — [S-06](phase-5-service-blueprints.md#s-06-avero-code-generator), injected random source.
2. **builds** module: E-10 save, E-05 restore ([S-07](phase-5-service-blueprints.md#s-07-builds)); snapshot fields per D-07; `outdated` computed on read; no update path.
3. Rate limits on E-10 (20/h) and E-05.

Depends on: Sprint 3. Exit: Q-RE-21, Q-RE-22, Q-IV-05, Q-DI-02–Q-DI-04, Q-RL-06, Q-ER-07, Q-SE-04 (E-10).

### Sprint 5 · Build · Feb 1 – Feb 14

Build:

1. **enquiries** module: E-11 intake ([S-08](phase-5-service-blueprints.md#s-08-enquiry-intake)), spam guard ([S-20](phase-5-service-blueprints.md#s-20-spam-guard)), honeypot silent success, consent, test-drive-only fields, build-code resolution, 5/h limit.
2. **OD-03, OD-04** decided; Turnstile (I-10) and alert email (I-11) behind env flags if enabled.
3. **jobs** module: E-37 retention ([S-10](phase-5-service-blueprints.md#s-10-retention)), `CronSecretGuard`, `apps/api/vercel.json` crons ([Phase 7 §13](phase-7-backend-architecture.md#13-jobs-and-cron)).

Depends on: Sprint 4 (build codes). Exit: Q-IV-06, Q-IV-07, Q-SE-14, Q-PV-01–Q-PV-05, Q-PV-08, Q-AZ-07, Q-RL-04, Q-RL-05.

### Sprint 6 · Build · Feb 15 – Feb 28

Build:

1. **journal** module: E-06, E-07 (S-11 visibility predicate, SEO fallbacks, cursor); admin E-21–E-25 (S-12: TipTap allow-list in `lib/tiptap.ts`, status rules, optimistic lock).
2. **OD-02** decided; **media** module: E-26 (S-13), blob service (I-04; propose the storage SDK).
3. **Revalidation** S-14 (I-08) and E-38 publishing job (I-07).
4. Seed the three launch articles.

Depends on: Sprint 2 (admin auth). Exit: Q-RE-24, Q-IV-08, Q-IV-10, Q-IV-12, Q-PV-07, Q-CA-07, Q-ER-06.

### Sprint 7 · Launch · Mar 1 – Mar 14

Build:

1. **OD-05** decided; **assets** module: E-33 token (I-03), E-34 register with S-16 + `lib/glb.ts` (S-17), E-35 list, E-36 live switch; partial unique index migration; E-04 manifest (S-15).
2. **Leads and builds admin:** E-16–E-18 (S-09 with `lib/enquiry-status.ts`), E-19, E-20 (S-21; documented raw query).
3. **Catalogue admin:** E-27–E-32 (S-05 guards, serialised version bumps, revisions, variant warnings).

Fallback if the sprint slips: move E-27–E-32 to Sprint 8.

Depends on: Sprints 2, 4, 6. Exit: Q-RE-23, Q-DI-05–Q-DI-10, Q-SE-12, Q-SE-13, Q-CA-04, Q-RL-07, Q-PF-04, Q-PF-05, Q-PF-07.

### Sprint 8 · Launch · Mar 15 – Mar 28

Build and verify:

1. Staging and production per [Phase 7 §16](phase-7-backend-architecture.md#16-environments-and-deployment); env vars; Blob CORS and content types (I-05).
2. Error tracking (propose the SDK), structured logs, alerts, uptime monitor (I-13).
3. Load test E-03 and E-09 at 50 rps for 5 minutes (propose the tool).
4. Full Phase 9 pass; restore and rollback drills.

Exit: every Phase 9 item passed or Deferred with a reason.

## 7. Code patterns

These follow the existing code (the `users` module and `user.repo.ts`). Paths are relative to `apps/api/src`.

### 7.1 Error codes and AppException

```ts
// common/enums/error-codes.ts
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  CONFIGURATION_INVALID: 'CONFIGURATION_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  // …every code in Phase 4 §2
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

```ts
// common/errors/app.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '../enums/error-codes.js';

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
```

### 7.2 Error filter (spec envelope)

```ts
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    response.status(status).json({ error: toErrorBody(exception, status) });
  }
}
```

`toErrorBody` lives in `common/errors/error-map.ts`: an `AppException` passes its `code`, `message` and `details` through; any other `HttpException` maps its status to a generic code (`400 → VALIDATION_FAILED`, `401 → UNAUTHORIZED`, `403 → FORBIDDEN`, `404 → RESOURCE_NOT_FOUND`, `429 → RATE_LIMITED`, else `INTERNAL_ERROR`).

### 7.3 Controller

```ts
// modules/core/configurator/configurator.controller.ts
@ApiTags('configurator')
@Controller('configurator')
export class ConfiguratorController {
  constructor(private readonly configurator: ConfiguratorService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitPolicy.validate)
  @ApiOperation({ summary: 'Validate a selection and return price and conflicts' })
  @ApiEnvelope(ValidationResultDto)
  @ApiErrors(ErrorCode.TRIM_NOT_FOUND, ErrorCode.MODEL_NOT_CONFIGURABLE, ErrorCode.OPTION_NOT_AVAILABLE, ErrorCode.RATE_LIMITED)
  validate(@Body() dto: ValidateConfigurationDto) {
    return this.configurator.validate(dto);
  }
}
```

Admin controllers put guards at class level:

```ts
@ApiTags('admin-enquiries')
@ApiCookieAuth()
@Roles(AdminRole.admin)
@UseGuards(JwtAuthGuard, RolesGuard, OriginGuard)
@Controller('admin/enquiries')
export class AdminEnquiriesController { /* … */ }
```

### 7.4 DTO

```ts
// modules/core/configurator/dto/validate-configuration.dto.ts
export class ValidateConfigurationDto {
  @ApiProperty({ example: 'gt-launch-edition' })
  @Matches(CATALOGUE_CODE_PATTERN)
  trim!: string;

  @ApiProperty({ type: [String], example: ['paint-obsidian-black', 'wheel-21-carbon'] })
  @IsArray()
  @ArrayMaxSize(MAX_SELECTED_OPTIONS)
  @ArrayUnique()
  @Matches(CATALOGUE_CODE_PATTERN, { each: true })
  selected!: string[];
}
```

Enums get `enumName` so the contract has named schemas:

```ts
@ApiProperty({ enum: EnquiryType, enumName: 'EnquiryType' })
@IsEnum(EnquiryType)
type!: EnquiryType;
```

### 7.5 Service

```ts
// modules/core/configurator/configurator.service.ts
@Injectable()
export class ConfiguratorService {
  constructor(private readonly snapshots: SnapshotService) {}

  async validate(dto: ValidateConfigurationDto): Promise<ValidationResult> {
    const snapshot = await this.snapshots.forTrim(dto.trim, dto.selected); // throws TRIM_NOT_FOUND, MODEL_NOT_CONFIGURABLE, OPTION_NOT_AVAILABLE
    return evaluate(snapshot, dto.selected); // pure, lib/rules-engine
  }
}
```

### 7.6 Repository

Thin wrappers, same shape as the existing `UserRepo`:

```ts
// common/repos/build.repo.ts
@Injectable()
export class BuildRepo {
  constructor(private readonly prisma: PrismaService) {}

  async create<T extends Prisma.BuildCreateArgs>(params: Prisma.SelectSubset<T, Prisma.BuildCreateArgs>) {
    try {
      return await this.prisma.build.create(params);
    } catch (error) {
      throw failed('create build', error);
    }
  }
  // findUnique, findMany, count — no update method (INV-06)
}
```

### 7.7 Error mapping from repos

```ts
// in BuildsService.save
for (let attempt = 0; attempt < CODE_MAX_ATTEMPTS; attempt++) {
  try {
    return await this.builds.create({ data: { ...snapshot, code: generateCode(this.random) }, select: buildSelect });
  } catch (error) {
    if (error instanceof RepoError && error.hasPrismaCode(PrismaCode.uniqueViolation)) continue;
    throw error;
  }
}
throw new AppException(ErrorCode.CODE_GENERATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, 'Could not save the build. Try again.');
```

### 7.8 Rule function (pure)

```ts
// lib/rules-engine/resolve.ts
export function resolveSelection(snapshot: Snapshot, selected: readonly string[]): Resolution {
  const byCategory = indexOptionsByCategory(snapshot);
  const chosen = applySelections(snapshot, selected);    // step 1
  fillDefaults(snapshot, byCategory, chosen);             // step 2
  const { selected: s, included, displaced } = applyIncludes(snapshot, chosen); // step 3
  return { selected: s, included, displaced };
}

// lib/rules-engine/index.ts
export function evaluate(snapshot: Snapshot, selected: readonly string[]): ValidationResult {
  const resolution = resolveSelection(snapshot, selected);
  const conflicts = findConflicts(snapshot, resolution);  // steps 4–7
  return toResult(snapshot, resolution, conflicts);        // step 8 + S-02
}
```

No `Date`, no `Math.random`, no logger, no Nest import anywhere under `lib/`.

### 7.9 Rules engine test

```ts
// lib/rules-engine/evaluate.spec.ts
describe('S-01 worked examples', () => {
  it('example 1: carbon wheels need the Performance Package', () => {
    const result = evaluate(gtSnapshot, ['paint-obsidian-black', 'wheel-21-carbon', 'trim-ivory-leather']);
    expect(result.valid).toBe(false);
    expect(result.conflicts).toEqual([
      expect.objectContaining({ type: 'requires', option: 'wheel-21-carbon', needs: 'pkg-performance', fix: { add: ['pkg-performance'], remove: [] }, fixPrice: 840_000 }),
    ]);
    expect(result.price).toEqual({ base: 18_950_000, options: 1_200_000, total: 20_150_000, currency: 'EUR' });
  });
});
```

The fixture `gtSnapshot` is the table in [S-01 worked examples](phase-5-service-blueprints.md#s-01-worked-examples).

### 7.10 Job endpoint

```ts
// modules/core/jobs/cron.controller.ts
@ApiExcludeController()
@UseGuards(CronSecretGuard)
@Controller('internal/cron')
export class CronController {
  constructor(private readonly retention: RetentionService, private readonly journal: JournalAdminService) {}

  @Get('enquiry-retention')
  purge() {
    return this.retention.run();
  }

  @Get('publish-articles')
  publish() {
    return this.journal.publishDue();
  }
}
```

`CronSecretGuard` compares `Authorization: Bearer <CRON_SECRET>` with `timingSafeEqual`.

### 7.11 Upload token

```ts
// modules/core/assets/asset-admin.service.ts
async issueUploadToken(dto: UploadTokenDto): Promise<UploadTokenResult> {
  const model = await this.requireLiveModel(dto.modelCode);          // MODEL_NOT_FOUND / MODEL_NOT_CONFIGURABLE
  await this.requireUnusedVersion(model.id, dto.version);             // VERSION_TAKEN
  const pathname = assetPath(model.code, dto.version, dto.fileName);
  return this.blob.clientToken({
    pathname,
    allowedContentTypes: contentTypesFor(dto.tier),
    maximumSizeInBytes: ASSET_MAX_BYTES,
    validUntil: Date.now() + ASSET_TOKEN_TTL_MS,
  });
}
```

`this.blob` wraps the storage SDK (Phase 7 §12); the SDK itself is installed only after approval.

### 7.12 Cache headers

```ts
@Get(':code/configurator')
@CacheClass(CacheClassName.catalogue)
@ApiEnvelope(ConfiguratorDataDto)
configurator(@Param() { code }: ModelCodeParamDto) {
  return this.catalogue.configurator(code); // returns { body, etagSource }
}
```

The interceptor computes the ETag from `etagSource`, answers 304 on match, otherwise sets `Cache-Control` and `ETag` and passes `body` to the envelope interceptor.

### 7.13 Transactions with a version bump

```ts
await this.prisma.$transaction(async (tx) => {
  await this.trimOptions.upsert({ where, create, update }, tx);
  const next = await this.revisions.next(tx);            // locks the latest revision row
  await this.revisions.create({ data: { version: next, summary, changedById: admin.id } }, tx);
});
```

Repos accept an optional transaction client; services own the transaction boundary.

## 8. Testing strategy

| Layer | Target | Notes |
| --- | --- | --- |
| Unit (`lib/`) | 100% branches on rules engine and pricing; exhaustive transition table; code generator over 100k draws | Fast, no Nest |
| Service | Every service with mocked repos and clients | Error mapping, guards, side effects |
| Integration (e2e) | Every endpoint, happy path + each error code it documents | Disposable Postgres on the local container, migrated and seeded per run |
| Contract | Regenerate + diff in CI; breaking-change diff | Fails the build |
| Load | E-03, E-09 at 50 rps, 5 min, staging | Sprint 8 |

Priorities, in order: rules engine (Q-RE), authorisation (Q-AZ), data integrity (Q-DI), privacy (Q-PV), contract (Q-CT).

## 9. Pre-launch QA by category

All 138 items are in [Phase 9](phase-9-qa-checklist.md). Highlights per area:

| Area | Items | Must pass |
| --- | --- | --- |
| Rule correctness | Q-RE-01–24 | Worked examples; property tests; outdated builds |
| Input validation | Q-IV-01–12 | Unknown fields rejected everywhere; client prices rejected |
| Authorisation | Q-AZ-01–10 | Route enumeration; refresh reuse; cron secret |
| Security | Q-SE-01–16 | Rate limits; cookies; scoped uploads; no leaks in errors |
| Privacy | Q-PV-01–08 | 90-day retention; masked logs; no PII in alerts |
| Data integrity | Q-DI-01–12 | Integer money; immutable builds; version bumps |
| Contract | Q-CT-01–07 | CI diff; named schemas; error codes documented |
| Errors | Q-ER-01–07 | One envelope everywhere |
| Performance | Q-PF-01–07 | Engine < 1 ms; SLOs under load |
| Caching | Q-CA-01–07 | ETags; immutable files; revalidation |
| Reliability | Q-RL-01–07 | Fail-open/closed; idempotent jobs |
| Observability | Q-OB-01–06 | Request IDs; alerts |
| Operability | Q-OP-01–08 | Migrations in deploy; drills |
| DX | Q-DX-01–07 | Fresh clone works; lint rules for layering |

## 10. Pre-merge checklist

- [ ] Change traces to IDs (`BR`, `F`, `E`, `S`, `I`) in the PR description
- [ ] Shapes match Phase 4; if not, Phase 4 updated first and the frontend owner told
- [ ] DTOs reject unknown fields; enums have `enumName`
- [ ] `@ApiEnvelope` and `@ApiErrors` on every new route
- [ ] Access level, rate limit and cache class decided for every new route
- [ ] Prisma only in repos; pure logic in `lib/`; no `console.*`
- [ ] Migration included for schema changes
- [ ] Tests: unit for pure logic, e2e for each new route and its error codes
- [ ] `pnpm --filter @avero/api typecheck`, `lint`, `test` pass (run one at a time)
- [ ] `pnpm contract:generate` run; contract committed
- [ ] No new dependency without approval
- [ ] Phase 8 status updated

## 11. Deployment readiness

From [Phase 8 §10](phase-8-implementation-roadmap.md#10-deployment-readiness):

- [ ] Phase 9 passed or items Deferred with reasons
- [ ] Production env vars set, including JWT keys (blocked today on Vercel access)
- [ ] Production migrations applied via `db:deploy` against `DIRECT_URL` — confirm first; `20261124000000_users` drops the old `Model` table
- [ ] Crons visible and succeeding
- [ ] Blob CORS and content types verified
- [ ] Uptime monitor and error tracking live
- [ ] Restore and rollback drills recorded

## 12. References

| File | Use |
| --- | --- |
| [phase-1-service-vision.md](phase-1-service-vision.md) | Rules, assumptions, open decisions |
| [phase-2-flow-maps.md](phase-2-flow-maps.md) | Server behaviour per capability |
| [phase-3-domain-model.md](phase-3-domain-model.md) | Schema, invariants, lifecycles |
| [phase-4-api-surface.md](phase-4-api-surface.md) | Shapes and errors |
| [phase-5-service-blueprints.md](phase-5-service-blueprints.md) | Algorithms |
| [phase-6-integration-contracts.md](phase-6-integration-contracts.md) | Edges |
| [phase-7-backend-architecture.md](phase-7-backend-architecture.md) | Code organisation |
| [phase-8-implementation-roadmap.md](phase-8-implementation-roadmap.md) | Sprints and status |
| [phase-9-qa-checklist.md](phase-9-qa-checklist.md) | Checks |
| [START_HERE.md](START_HERE.md) · [README.md](README.md) · [BACKEND-OS-COMPLETE.md](BACKEND-OS-COMPLETE.md) · [ARTIFACT_INDEX.md](ARTIFACT_INDEX.md) · [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) | Navigation and setup |
| [`apps/api/CLAUDE.md`](../../CLAUDE.md) | Host conventions (binding) |
