# AVERO Backend OS

> v1.0 · generated 2026-11-24 · source: [AVERO — Backend Spec](../../docs/AVERO%20%E2%80%94%20Backend%20Spec.md) (Nov 22, 2026) · generator: [Backend Master Prompt](../../docs/BACKEND_MASTER_PROMPT.md)
> New here? Start with [START_HERE.md](START_HERE.md).

## What this is

A complete, implementation-ready specification of the AVERO V1 backend: the NestJS API that holds the car catalogue, decides which configurations are valid and what they cost, saves shareable builds as AVERO Codes, takes enquiries and test-drive requests, serves the journal and versioned 3D assets, and powers the admin area.

It defines **contracts**, not screens. Request and response shapes are fixed in Phase 4; how the frontend shows them is decided in the frontend design OS.

## Quick start

- Read [Phase 1](phase-1-service-vision.md) §7 for the business rules and §15 for the open decisions.
- Check the [Phase 8 status register](phase-8-implementation-roadmap.md#5-status-register) to see what is built.
- Build a sprint with [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md).

## Files

| File | Purpose |
| --- | --- |
| [phase-1-service-vision.md](phase-1-service-vision.md) | Vision, ownership, consumers (`C-xx`), business rules (`BR-xx`), SLOs, assumptions (`A-xx`), open decisions (`OD-xx`) |
| [phase-2-flow-maps.md](phase-2-flow-maps.md) | 19 server-side flows (`F-xx`) with sequences, failure paths and guarantees |
| [phase-3-domain-model.md](phase-3-domain-model.md) | 15 entities (`D-xx`), invariants (`INV-xx`), state machines, PII inventory, retention, Prisma sketch |
| [phase-4-api-surface.md](phase-4-api-surface.md) | Conventions, error catalogue, 39 endpoint blueprints (`E-xx`) |
| [phase-5-service-blueprints.md](phase-5-service-blueprints.md) | 23 services (`S-xx`), the rules engine algorithm and worked examples |
| [phase-6-integration-contracts.md](phase-6-integration-contracts.md) | 14 boundary contracts (`I-xx`): cookies, Blob, CDN, cron, revalidation, Postgres |
| [phase-7-backend-architecture.md](phase-7-backend-architecture.md) | Folder layout, module map, pipeline, env, deployment, spec-vs-code changes (`R-xx`) |
| [phase-8-implementation-roadmap.md](phase-8-implementation-roadmap.md) | 9 sprints over 18 weeks, status register, unspecified code, risks |
| [phase-9-qa-checklist.md](phase-9-qa-checklist.md) | 138 pass/fail checks (`Q-xx`) |
| [START_HERE.md](START_HERE.md) | Entry point |
| [BACKEND-OS-COMPLETE.md](BACKEND-OS-COMPLETE.md) | Master index and ID registry |
| [ARTIFACT_INDEX.md](ARTIFACT_INDEX.md) | Deep descriptions, reading orders, keywords, status roll-up |
| [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) | Environment and project setup |
| [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md) | The engineering guide, sprint by sprint |

## How to use it by role

**Product (both owners)**
- Phase 1: confirm the business rules and decide the open decisions.
- Phase 8: agree the sprint dates so items move from Specified to Scheduled.

**Backend developer**
- Phases 3–7 are your blueprint; IMPLEMENTATION_PROMPT is your build order.
- Phase 7 §21 lists every change today's code needs.

**Frontend developer (Cage)**
- Phase 4 gives every shape you will consume, and the error codes to branch on.
- Phase 6 I-01 covers type generation and the breaking-change policy; I-14 is the Blender export contract.
- Phase 5 S-01 explains what the server will answer, so local predictions in the configurator match it.

**QA**
- Phase 9: every item has a method; Phase 5 worked examples are ready-made test cases.

## Key statistics

| Measure | Count |
| --- | --- |
| Phases | 9 (+ 6 ancillary files) |
| Business rules | 42 |
| Flows | 19 |
| Entities | 15 |
| Endpoints | 39 IDs, 57 operations |
| Services | 23 (5 pure) |
| Integration contracts | 14 |
| Timeline | 18 weeks (Nov 23, 2026 – Mar 28, 2027) |
| QA items | 138 |

## Getting started in 5 minutes

1. Skim [Phase 1 §2–§3](phase-1-service-vision.md#2-service-purpose): what the backend owns.
2. Read [Phase 5 S-01 worked examples](phase-5-service-blueprints.md#s-01-worked-examples): the heart of the system.
3. Look at [Phase 4 §3 endpoint index](phase-4-api-surface.md#3-endpoint-index).
4. Read [Phase 7 §21](phase-7-backend-architecture.md#21-spec-vs-code-reconciliation): the distance from today's code.
5. Open [Phase 8 Sprint 0](phase-8-implementation-roadmap.md#sprint-0--nov-23--dec-6-spike) and start.

## Philosophy

- **The server is the source of truth.** Every price, total, inclusion and conflict is computed server-side; client numbers are never trusted.
- **Contracts first.** One OpenAPI document; the frontend generates its types from it; CI blocks unapproved breaking changes.
- **Snapshots are immutable.** Builds and asset files are never rewritten.
- **No ambiguity.** Every artifact has a stable ID, one home and a status.
- **Scope is preserved.** Unbuilt features keep their place with a status; nothing is dropped silently.
