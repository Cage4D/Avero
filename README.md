# AVERO

AVERO is a fictional luxury automotive brand, built as a portfolio project. The site pairs an
immersive 3D frontend (Next.js + React Three Fiber) with a typed NestJS API, sharing one
OpenAPI-generated contract so the frontend and backend never drift apart.

> AVERO is a fictional concept. It is not a real company, and none of its vehicles exist.

## Structure

```
avero/
├─ apps/
│  ├─ web/        Next.js (App Router): frontend + 3D
│  └─ api/        NestJS + Prisma + PostgreSQL: REST API under /api/v1
├─ packages/
│  ├─ contract/   Types generated from the API's OpenAPI document + optionCodes.ts
│  └─ config/     Shared tsconfig, ESLint (flat) and Prettier config
├─ scripts/       Setup / bootstrap scripts
└─ .github/       CI workflow
```

Tasks are orchestrated by [Turborepo](https://turborepo.com) on top of pnpm workspaces.

## Prerequisites

- Node.js 24 LTS (version pinned in `.nvmrc`, so run `nvm use`)
- pnpm 12 (`npm install -g pnpm`)
- Docker (for the local Postgres 16 database)

## Setup

```bash
./scripts/setup.sh
```

The script checks your Node version, installs dependencies, creates `.env` files from the
`.env.example` files, generates the API's JWT keys, starts Postgres with Docker Compose, applies migrations, seeds the database
and generates the contract.

## Running

```bash
pnpm dev
```

- Web: http://localhost:3000 (lab routes: `/lab/viewer`, `/lab/api`)
- API: http://localhost:4000/api/v1 (Swagger UI: http://localhost:4000/api/v1/docs)

The seed creates `admin@example.com` / `password123` plus 20 random users.

### API routes

Every response is wrapped in `{ statusCode, message, data, timestamp }`. Auth is an RS256 JWT sent
as `Authorization: Bearer <token>`.

| Module   | Routes (under `/api/v1`)                                        |
| -------- | --------------------------------------------------------------- |
| `auth`   | `POST /auth/register`, `POST /auth/login`                       |
| `users`  | CRUD on `/users` (create, list, delete: admin), `GET /users/me` |
| `stats`  | `GET /stats/users/total`, `GET /stats/users/series` (admin)     |
| `health` | `GET /health`                                                   |

The API's layering rules live in [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md).

| Script                                   | What it does                                          |
| ---------------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                               | Runs web and api in parallel                          |
| `pnpm build`                             | Builds every app                                      |
| `pnpm lint`                              | ESLint across the workspace                           |
| `pnpm typecheck`                         | TypeScript checks across the workspace                |
| `pnpm test`                              | Runs tests (API e2e with Jest + Supertest)            |
| `pnpm format`                            | Formats everything with Prettier                      |
| `pnpm contract:generate`                 | Regenerates `packages/contract` from the API          |
| `pnpm db:migrate`                        | Creates/applies Prisma migrations (`migrate dev`)     |
| `pnpm db:seed`                           | Seeds the database                                    |
| `pnpm --filter @avero/api keys:generate` | Prints a fresh RS256 JWT key pair for `apps/api/.env` |

## Regenerating the contract

Whenever an API endpoint or DTO changes:

```bash
pnpm contract:generate
```

This exports the API's OpenAPI document to `packages/contract/openapi.json` and runs
`openapi-typescript` to produce `packages/contract/src/generated/api.ts`. Commit both files. CI
fails if the committed contract doesn't match what the API generates.

## Deployment

Both apps deploy to Vercel as **two separate projects from this one repository**. Every push to
`main` deploys both to production; other branches get preview deployments.

| Vercel project | Root Directory | Live URL                                                                   | Notes                                                                                                                     |
| -------------- | -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `avero-web`    | `apps/web`     | [avero-web-azure.vercel.app](https://avero-web-azure.vercel.app)           | Set `API_URL` and `NEXT_PUBLIC_SITE_URL`                                                                                  |
| `avero-api`    | `apps/api`     | [avero-api-psi.vercel.app/api/v1](https://avero-api-psi.vercel.app/api/v1) | Zero-config NestJS (`src/main.ts`). Set `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGINS`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` |

The database is a Neon Postgres (`avero-db`) from the Vercel Marketplace, connected to
`avero-api`. Neon provides `DATABASE_URL` (pooled, used at runtime) and `DATABASE_URL_UNPOOLED`;
`DIRECT_URL` holds the unpooled value and is used by Prisma migrations. Migrations aren't run during
the Vercel build. Apply them yourself with `DIRECT_URL` pointing at the production database:

```bash
pnpm --filter @avero/api db:deploy
```

On WSL, add `NODE_OPTIONS=--dns-result-order=ipv4first` if Prisma can't reach the Neon host.

On **both** projects, also set `ENABLE_EXPERIMENTAL_COREPACK=1`. Without it, Vercel ignores the
`packageManager` field and guesses an older pnpm version from the lockfile.

The API's build copies the Swagger UI assets into `apps/api/swagger-ui/` (gitignored), and
`src/main.ts` serves them from there. Vercel can't trace the files `@nestjs/swagger` reads from
`node_modules` at runtime, so without this `/api/v1/docs` would load a blank page.

## Git conventions

- `main` always holds both apps and must stay deployable.
- Work happens on short-lived branches named `feat/…`, `fix/…` or `chore/…`, merged by pull
  request within a few days, then deleted.
- Anything touching `packages/contract` or the Prisma schema (`apps/api/prisma`) needs review from
  the other developer.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)
  (`feat(web): …`, `fix(api): …`, `chore: …`).

## Credits

- Brand, 3D and frontend: Cage4D ([github.com/cage4D](https://github.com/cage4D))
- Backend: hckerson ([github.com/hckerson](https://github.com/hckerson))

AVERO is a fictional concept created for portfolio purposes.
