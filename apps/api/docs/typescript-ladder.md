# TypeScript Ladder: Full-Stack Product Engineer

Researched and written on 24 November 2026. The same file lives in `nest-setup/docs` and `next-setup/docs`, because the ladder covers both halves of the stack. Sources are listed at the end.

## Where you're starting

TypeScript is your strongest language, so this ladder has no beginner tier.

- `nest-setup`: Prisma, Passport/JWT, Swagger, Jest.
- `next-setup`: TanStack Query, React Three Fiber, GSAP, Vitest, fast-check, and your own ESLint rules.
- Two Expo apps and three full-stack apps.

## What the job market asks for

- React appears in 54% of full-stack postings. TypeScript appears in 45–96%, depending on the sample.
- Next.js carries the biggest pay premium among full-stack skills: a US median of $143k, about $13k above the baseline. TypeScript is $140k, React $135k, Node.js $133.7k.
- Postgres with Prisma or Drizzle, CI/CD (42% of postings), AWS (40%), Docker (28.5%).
- Recruiters say React, Node.js, TypeScript, PostgreSQL and enough cloud to deploy your own code covers about 80% of the roles they fill. "React" without "TypeScript" on a CV is a yellow flag.
- What makes candidates stand out: system design, debugging across the whole stack, and enough DevOps to deploy and monitor their own code.
- Senior postings ask for "type-system depth" and experience with AI coding tools.

## The capstone

A multi-tenant booking and invoicing SaaS for small businesses. It has a Next.js web app, a Nest API and an Expo app, all generated from one OpenAPI contract (the nest-setup to next-setup contract pipeline already does this). From Tier 2 on, every project adds a piece of it.

## The ladder

| Tier         | #   | Project                                                                                                                       | Proves                            | Done when                                                                          |
| ------------ | --- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| 1 Depth      | 1   | A small Zod-like validation library with full type inference                                                                  | Type-system depth                 | `expectTypeOf` tests pass; published to npm                                        |
| 1            | 2   | Import a 1 GB CSV into Postgres using Node streams and `worker_threads`                                                       | Event loop, streams, backpressure | Memory stays flat; CPU profile in the README                                       |
| 2 Production | 3   | Make `nest-setup` production-ready: Docker, Testcontainers, Pino logging, OpenTelemetry, Redis cache, rate limiting           | Production backend                | `docker compose up` works; CI runs tests against a real Postgres                   |
| 2            | 4   | OIDC login, refresh-token rotation with reuse detection, role-based access, tenant isolation with Postgres row-level security | Security, multi-tenancy           | A request with a forged tenant ID is rejected by the database                      |
| 2            | 5   | Playwright end-to-end tests, axe accessibility checks, Lighthouse CI budgets                                                  | Testing, Core Web Vitals          | CI blocks any PR that makes page load (LCP) or accessibility worse                 |
| 3 Product    | 6   | Live schedule board with presence, using WebSockets and a Redis adapter                                                       | Realtime across several servers   | Two API replicas share events; reconnecting misses nothing                         |
| 3            | 7   | Background jobs with BullMQ; Stripe and Paystack webhooks; a reconciliation job                                               | Queues, idempotency, money        | Replaying a webhook 10 times charges once; failed jobs land in a dead-letter queue |
| 3            | 8   | Offline-first Expo app: SQLite, sync queue, push notifications, EAS updates                                                   | Mobile depth                      | Records created offline sync after reconnecting, with conflicts handled            |
| 4 Ship       | 9   | Turborepo monorepo: web, API, mobile, plus shared contract and UI packages                                                    | Monorepo, CI at scale             | Changing a shared package rebuilds only what depends on it                         |
| 4            | 10  | AWS deployment with CDK: ECS Fargate, RDS, S3 presigned uploads, CloudFront                                                   | AWS, infrastructure as code       | CI builds the whole stack in an empty AWS account                                  |
| 5 Hero       | 11  | AI assistant inside the SaaS: streaming UI, tool calls into your API, an eval set                                             | AI integration                    | Accuracy table in the README                                                       |
| 5            | 12  | Publish your ESLint rules as a plugin; contribute to Nest, Prisma or TanStack                                                 | Open-source proof                 | Plugin on npm; one merged PR                                                       |

Roughly 4–5 months part-time. This is an estimate.

## Rules for every project

- A README with an architecture diagram and the trade-offs you made.
- Tests running in CI.
- A Dockerfile for anything with a server.
- At least one measured number: a benchmark, a load test or a Lighthouse score.

Projects without these read as tutorials.

## How the four ladders fit together

There are matching ladders for Go (`go/setup/docs`), Python (`python/setup/docs`) and C# (`c#/c#-setup/docs`). Don't run them all at once.

| Order | Ladder                  | Why                                                                                           |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------- |
| 1     | TypeScript              | Your strongest language and the biggest market. The quickest route to income                  |
| 2     | Go                      | Run alongside TypeScript, for the higher-paid backend and platform roles                      |
| 3     | Python (AI engineering) | Move it ahead of Go if you mainly want Upwork AI work, where AI integration demand is up 178% |
| 4     | C#                      | Last, and only if you want enterprise .NET jobs                                               |

Several projects are the same work in a different language. Do each one thoroughly once; porting it afterwards takes days, not weeks.

| Theme                                | Go   | TypeScript | Python | C#  |
| ------------------------------------ | ---- | ---------- | ------ | --- |
| Production-ready setup               | 6    | 3          | 3      | 4   |
| Bounded concurrency and backpressure | 4    | 2          | 1      | 2   |
| Idempotent payments and messaging    | 7, 8 | 7          | 9      | 8   |
| AI integration                       | 15   | 11         | 5–7    | 10  |
| Open-source contribution             | 14   | 12         | 12     | —   |

## Sources

[InterviewStack full-stack](https://interviewstack.io/blog/fullstack-developer-skills-companies-want-2026) · [KORE1 full-stack](https://www.kore1.com/hire-full-stack-developer/) · [MirrorCV](https://mirrorcv.com/resume-guide/full-stack-developer) · [Cohesyve job description](https://www.cohesyve.com/job-description/full-stack-developer) · [Ambition posting](https://freehire.me/jobs/senior-typescript-fullstack-developer-reactjs-nextjs-nodejs-ambition-735lfpc4) · [ResumeGeni](https://resumegeni.com/skills-guides/full-stack-developer-skills-guide) · [GradMaze](https://gradmaze.com/high-demand-full-stack-developer-roles-and-skills-in-2026/) · [Upwork In-Demand Skills 2026](https://www.upwork.com/press/releases/upworks-in-demand-skills-2026-demand-for-top-ai-skills-more-than-doubles-as-ai-is-embedded-into-everyday-work)
