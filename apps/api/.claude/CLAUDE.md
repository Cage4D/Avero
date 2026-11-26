# Project Instructions

Reusable **NestJS + Prisma + Redis backend starter**: strict, layered, observable, type-safe, and contract-identical to `go/setup`.

## Rules

1. **One job per file.** `*.controller.ts` HTTP only · `*.service.ts` business logic only · `*.repo.ts` data access only · `*.module.ts` DI wiring only · `*.dto.ts` validation only. Split files over ~150 lines.
2. **Prisma is touched only in `common/repos/[domain].repo.ts`** (plus the readiness ping in `common/observability/readiness.service.ts` and `prisma/seed.ts`).
3. **Layers flow one way:** Controller → Service → Repository → Prisma. Controllers never call repos, services never touch Express `req`/`res` or Prisma directly, repos hold no business logic. `eslint.config.mjs` enforces these boundaries mechanically.
4. **Services never return raw Prisma models.** Return domain/response objects (internal exception: `UsersService.findByEmail` for password verification).
5. **Single source of truth.** Models in `schema.prisma`, validation in DTOs, errors in `common/errors/`, shared auth guards/decorators/types in `common/security/`, constants and messages in `common/enums/`.
6. **Use the framework.** Prisma over raw SQL, class-validator + `ParseUUIDPipe` over custom validators, `@common/security` guards over custom middleware, `ResponseInterceptor` and `HttpExceptionFilter` over ad-hoc wrappers, `CacheService` and `@nestjs/throttler` over hand-rolled state.
7. **No hardcoding.** Config, secrets, URLs, ports, magic numbers, role names and repeated literals live in validated env (`ConfigService` via `common/config/env.validation.ts`) or `common/enums/`. Never read `process.env` directly inside Nest providers.
8. **No dead code, stubs or placeholders.** Repositories expose only the Prisma methods the application actually calls.
9. **No `console.*` in `src/`.** Use the Nest/Pino logger. `no-console: error` enforces this.
10. **Absolute imports** via `@common/*`, `@core/*`, and `@lib/*`.

Don't invent locations; if unsure where something goes, the design is broken, so re-read this.

## Derive, never reconstruct

Use the type a framework derives: `Prisma.[Model]GetPayload<>`, `z.infer`, validated DTOs, guard-authenticated requests, the interceptor's wrapped response (return the domain object, don't build `{ status, data, message }`). Never replace one with `any`, `Record<>`, `as`, or a hand-written parallel type; narrow with `Pick`/`Omit`.

## Layer contracts

- **Controller:** extract params (`uuidPipe` on UUID `:id`) and body, call the service, return the result. Protected routes get `@UseGuards(JwtAuthGuard)` + `@Roles()` from `@common/security`.
- **Service:** accepts DTOs, enforces business rules, throws `HttpException`s (never leaks `RepoError` details to clients; `HttpExceptionFilter` logs and sanitizes all `5xx` errors), returns domain objects.
- **Repository:** thin `try/catch` wrappers around the Prisma methods actually used, rethrowing `RepoError`. No business logic.
- **DTO:** class-validator at the boundary (including `PASSWORD_MAX_LENGTH = 72` for bcrypt); `UpdateDto extends PartialType(CreateDto)`. Never a response shape.
- **Bootstrap:** `src/instrument.ts` preloads OpenTelemetry before `AppModule`; `src/app.setup.ts` owns shared HTTP pipeline wiring for both `src/main.ts` and `test/apitest.ts`.

## Layout

- `common/cache/` — `CacheService` (Redis via `ioredis` with in-memory fallback) and `RedisThrottlerStorage`.
- `common/config/` — Zod env validation (`env.validation.ts`) and RS256 key loaders (`jwt-keys.ts`).
- `common/database/` — `PrismaService` (wired to `ConfigService` with clean `$disconnect()`).
- `common/observability/` — Pino logger, `X-Request-ID` middleware, Prometheus `MetricsService`, `ReadinessService`, OTel `tracing.ts`, and isolated `admin-server.ts` (`ADMIN_PORT`).
- `common/security/` — `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `AuthUser`, `JwtPayload` (acyclic — modules never import `@core/auth/*`).
- `common/pipes/` — shared validation pipes (`uuidPipe`).
- `lib/` — pure helpers with no Nest dependencies (`period.ts`, `password.ts`; only `@common/enums/*` allowed).
- `modules/core/<domain>/` — `dto/`, service, controller, module; match `users`.
- `test/` — shared `apitest.ts`, zero-Docker HTTP E2E tests (`test/e2e/`), and Testcontainers Postgres+Redis tests (`test/integration/`).

## Before commit

No git hooks run. Gate manually (CI runs the full chain including Testcontainers and Docker build):

1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm test:e2e -- --detectOpenHandles`
5. `pnpm test:integration` (when Docker is running)
6. `pnpm openapi:check` — if any DTO, route, or `@ApiProperty` changed, run `pnpm openapi` and commit `openapi.json`, mirror the change in `go/setup`, and run `pnpm contract:parity` in `next-setup`.
