# API conventions (`@avero/api`)

NestJS 12 + Prisma 7 + PostgreSQL, ESM. Strict, layered, type-safe. Ported from the `nest-setup` starter.

## Rules

1. **One job per file.** `*.controller.ts` HTTP only · `*.service.ts` business logic only · `*.repo.ts` data access only · `*.module.ts` DI wiring only · `*.dto.ts` validation and response shapes only. Split files over ~150 lines.
2. **Prisma is touched only in `src/common/repos/<domain>.repo.ts`** (plus `prisma/seed.ts`).
3. **Layers flow one way:** Controller → Service → Repository → Prisma. Controllers never call repos, services never touch `req`/`res`, repos hold no business logic.
4. **Services never return raw Prisma models.** Return domain/response objects (`select` against the response DTO, as `userSelect` does).
5. **Single source of truth.** Models in `prisma/schema.prisma`, validation in DTOs, errors in `common/errors/`, auth in `modules/core/auth/`, constants and enums in `common/enums/`.
6. **Use the framework.** Prisma over raw SQL, class-validator over custom validators, guards over custom middleware, the global `ResponseInterceptor` over ad-hoc response wrappers.
7. **No hardcoding.** Config, secrets, URLs, magic numbers, role names and repeated literals live in env (`@nestjs/config`, validated in `common/config/env.validation.ts`) or `common/enums/`.
8. **No dead code, stubs or placeholders.**
9. **No `console.*` in `src/`.** Use the Nest `Logger`.
10. **Relative imports with a `.js` suffix.** This package is ESM and Vercel runs `src/main.ts` directly, so TS path aliases would not resolve at runtime.

## Derive, never reconstruct

Use the type a framework derives: `Prisma.<Model>GetPayload<>`, `z.infer`, validated DTOs, guard-authenticated requests, the interceptor's wrapped response (return the domain object, don't build `{ statusCode, data, message }`). Never replace one with `any`, `Record<>`, `as`, or a hand-written parallel type; narrow with `Pick`/`Omit`.

## Layer contracts

- **Controller:** extract params and body, call the service, return the result. Document with `@ApiEnvelope(Dto)`. Protected routes get `@UseGuards(JwtAuthGuard)` (+ `RolesGuard` and `@Roles()`).
- **Service:** accepts DTOs, enforces business rules, throws `HttpException`s (never `RepoError`), returns domain objects.
- **Repository:** only thin `try/catch` wrappers around Prisma's native methods, rethrowing `RepoError`. No custom domain methods.
- **DTO:** class-validator at the boundary; `UpdateDto extends PartialType(CreateDto)`. Declare fields with `!` (strict mode) and give enums an `enumName` so the contract gets a named schema.
- **Module:** imports, controller + service, export the service if shared.

## Layout

`src/common/` holds shared infrastructure (config, database, repos, filters, interceptors, errors, enums, decorators). `src/lib/` is pure helpers with no Nest dependencies; `period.ts` owns day/month/year boundaries. `src/modules/core/<domain>/` has `dto/`, service, controller, module; match the `users` module. `modules/core/auth/` is done, so extend it.

## Contract

The OpenAPI document is built from the compiled `dist/` (`pnpm openapi:export`), because `tsx`/esbuild does not emit the decorator metadata Nest DI and Swagger rely on. If any DTO, route or `@ApiProperty` changes, run `pnpm contract:generate` from the repo root and commit `packages/contract/openapi.json` and `src/generated/api.ts`.

## Before commit

Gate manually: `pnpm --filter @avero/api typecheck`, `lint`, `test`. Schema changes need a migration (`pnpm db:migrate`).
