# START HERE — AVERO Backend OS

> v1.0 · generated 2026-11-24 from [AVERO — Backend Spec](../../docs/AVERO%20%E2%80%94%20Backend%20Spec.md) using the [Backend Master Prompt](../../docs/BACKEND_MASTER_PROMPT.md)

Welcome. This folder is the complete backend specification for AVERO V1: what the API stores, decides and serves. It never says how anything looks; that is the frontend design OS's job.

## What's inside

- [x] Phase 1 — Service vision, consumers, 42 business rules
- [x] Phase 2 — 19 capability flows
- [x] Phase 3 — 15 entities, invariants, reference schema
- [x] Phase 4 — 39 endpoint blueprints, error catalogue
- [x] Phase 5 — 23 service blueprints, including the rules engine with worked examples
- [x] Phase 6 — 14 integration and job contracts
- [x] Phase 7 — Backend architecture and spec-vs-code reconciliation
- [x] Phase 8 — 18-week roadmap and the status register
- [x] Phase 9 — 138 QA checks

## The files

| File | Read it when you need… |
| --- | --- |
| [phase-1-service-vision.md](phase-1-service-vision.md) | Why the backend exists, who calls it, the business rules (`BR-xx`), assumptions, open decisions |
| [phase-2-flow-maps.md](phase-2-flow-maps.md) | What the server does, step by step, for each capability (`F-xx`) |
| [phase-3-domain-model.md](phase-3-domain-model.md) | Entities (`D-xx`), invariants, lifecycles, retention, the Prisma sketch |
| [phase-4-api-surface.md](phase-4-api-surface.md) | Every request and response shape (`E-xx`), errors, caching, pagination |
| [phase-5-service-blueprints.md](phase-5-service-blueprints.md) | Algorithms (`S-xx`): rules engine, pricing, AVERO Codes, auth, assets |
| [phase-6-integration-contracts.md](phase-6-integration-contracts.md) | Cookies, Blob uploads, CDN, cron, revalidation, rate-limit store (`I-xx`) |
| [phase-7-backend-architecture.md](phase-7-backend-architecture.md) | Folders, modules, request pipeline, env vars, what to change in today's code |
| [phase-8-implementation-roadmap.md](phase-8-implementation-roadmap.md) | Sprints, status of every artifact, code the spec doesn't ask for |
| [phase-9-qa-checklist.md](phase-9-qa-checklist.md) | Pass/fail checks before launch (`Q-xx`) |
| [README.md](README.md) | A 5-minute overview |
| [BACKEND-OS-COMPLETE.md](BACKEND-OS-COMPLETE.md) | The master index |
| [ARTIFACT_INDEX.md](ARTIFACT_INDEX.md) | Deep descriptions and reading orders per role |
| [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) | Getting a machine and the repo ready |
| [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md) | The self-contained build guide |

## Three steps

1. **Read.** Phase 1 §7 (rules), §14–15 (assumptions and open decisions), then the Phase 8 status register.
2. **Copy.** Open [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md) and copy it into a new session, naming the sprint you are building.
3. **Execute.** Build the sprint, run the host gate (typecheck, lint, test), tick the matching Phase 9 items, and update the status in Phase 8.

## Next session

Paste this into a new session:

```
Read apps/api/design-os/generated/IMPLEMENTATION_PROMPT.md and build Sprint <N>
from Phase 8. Follow apps/api/CLAUDE.md. Confirm with me before installing
any dependency. Update the Phase 8 status register when done.
```

## Before you build: decisions waiting on you

These are listed in [Phase 1 §15](phase-1-service-vision.md#15-open-decisions). The earliest ones needed:

| ID | Decision | Needed by |
| --- | --- | --- |
| OD-06 | Retire or adapt `/auth/register`, `/users`, `/stats` | Sprint 1 |
| OD-01 | Rate-limit store: Redis-compatible store or firewall rules | Sprint 3 |
| OD-03, OD-04 | Admin alert email, Turnstile in V1 | Sprint 5 |
| OD-02 | Image width variants: at upload or in the frontend | Sprint 6 |
| OD-05 | Variant mismatch: reject or flag | Sprint 7 |

## Quick reference

| I want to… | Go to |
| --- | --- |
| Know what an endpoint returns | [Phase 4](phase-4-api-surface.md) |
| Know which error code to throw | [Phase 4 §2](phase-4-api-surface.md#2-error-catalogue) |
| Implement the rules engine | [Phase 5 S-01](phase-5-service-blueprints.md#s-01-rules-engine) |
| Know how admin login works | [Phase 5 S-18](phase-5-service-blueprints.md#s-18-admin-auth) + [Phase 6 I-02](phase-6-integration-contracts.md#i-02-admin-session-cookies) |
| Add a table | [Phase 3 §14](phase-3-domain-model.md#14-reference-schema) |
| Know where a file goes | [Phase 7 §2](phase-7-backend-architecture.md#2-folder-structure) |
| Know what to change in today's code | [Phase 7 §21](phase-7-backend-architecture.md#21-spec-vs-code-reconciliation) |
| See what's built | [Phase 8 §5](phase-8-implementation-roadmap.md#5-status-register) |
| Check launch readiness | [Phase 9](phase-9-qa-checklist.md) |
| Ship a new GLB | [Phase 2 F-15](phase-2-flow-maps.md#f-15-ship-a-3d-asset-version) + [Phase 6 I-14](phase-6-integration-contracts.md#i-14-blender-export-contract) |

## Ground rules

- The server is the source of truth for every rule and every number.
- Shapes change only in Phase 4, then the contract is regenerated and the frontend owner is told.
- Nothing is deleted from the spec because it isn't built yet; it gets a status in Phase 8.
