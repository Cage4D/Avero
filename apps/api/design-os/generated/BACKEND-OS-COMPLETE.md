# AVERO Backend OS — Complete

> v1.0 · generated 2026-11-24 · source spec dated Nov 22, 2026 · generator: [Backend Master Prompt](../../docs/BACKEND_MASTER_PROMPT.md)
> Entry point: [START_HERE.md](START_HERE.md) · Overview: [README.md](README.md)

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Deliverables](#2-deliverables)
3. [Statistics](#3-statistics)
4. [ID registry](#4-id-registry)
5. [Cross-references](#5-cross-references)
6. [Included and not included](#6-included-and-not-included)
7. [Spec coverage](#7-spec-coverage)
8. [Version history](#8-version-history)

---

## 1. Executive summary

The AVERO backend is a stateless NestJS API on Vercel with Postgres (Prisma) and Vercel Blob. It owns the catalogue and its rules, the AVERO Code build snapshots, enquiries, the journal and 3D asset delivery, plus admin authentication and operations.

Its centre is a **pure rules engine** ([S-01](phase-5-service-blueprints.md#s-01-rules-engine)): defaults → selections with single-select replacement → transitive includes → requires and excludes → required categories, with a fix and price delta for every conflict. Prices are integer EUR cents, recomputed on every call. Saved builds freeze the price and the `rulesVersion`, and report themselves `outdated` when the catalogue moves on.

Around it: cookie-based admin sessions with short-lived RS256 access tokens and rotating refresh tokens; rate-limited public writes; a 90-day retention job; a journal with allow-listed TipTap bodies and frontend revalidation; and a 3D pipeline where GLBs upload straight to storage and are checked against option codes before they can go live.

Today's code (ported from the `nest-setup` starter) provides the foundation: layering, env validation, RS256 keys, bcrypt, guards, the success envelope, Swagger and the contract pipeline. [Phase 7 §21](phase-7-backend-architecture.md#21-spec-vs-code-reconciliation) lists the 14 changes from there to this design; [Phase 8](phase-8-implementation-roadmap.md) schedules them over 9 sprints.

## 2. Deliverables

### Core phases

| # | File | Description |
| --- | --- | --- |
| 1 | [phase-1-service-vision.md](phase-1-service-vision.md) | Vision, ownership boundary, goals, 7 consumers, 42 business rules, SLOs and North Star, governance, platform constraints, 10 assumptions, 6 open decisions, non-goals |
| 2 | [phase-2-flow-maps.md](phase-2-flow-maps.md) | Capability map and 19 flows: intent, trigger, sequence, decision points, side effects, idempotency, failures, dependencies |
| 3 | [phase-3-domain-model.md](phase-3-domain-model.md) | 7 bounded contexts, 15 entities, 12 invariants, 4 state machines, immutability rules, conventions, PII inventory, retention, indexes, migrations, seed, Prisma sketch |
| 4 | [phase-4-api-surface.md](phase-4-api-surface.md) | Envelopes, pagination, caching, auth, 35 error codes, 39 endpoint blueprints with examples |
| 5 | [phase-5-service-blueprints.md](phase-5-service-blueprints.md) | 23 services; rules engine algorithm with 6 worked examples; pricing; AVERO Code generator; auth; asset checks |
| 6 | [phase-6-integration-contracts.md](phase-6-integration-contracts.md) | 14 contracts: OpenAPI, cookies, Blob uploads, CDN, two crons, revalidation, rate-limit store, CAPTCHA, email, Postgres, logs, Blender export |
| 7 | [phase-7-backend-architecture.md](phase-7-backend-architecture.md) | Host conventions, folders, modules, pipeline, env, persistence, errors, auth, rate limits, caching, storage, cron, contract CI, monitoring, environments, dependencies, 14 reconciliation items |
| 8 | [phase-8-implementation-roadmap.md](phase-8-implementation-roadmap.md) | 9 sprints, dependency graph, status register, unspecified code, risks, testing, deployment readiness |
| 9 | [phase-9-qa-checklist.md](phase-9-qa-checklist.md) | 138 checks over 14 areas |

### Ancillary

| File | Description |
| --- | --- |
| [START_HERE.md](START_HERE.md) | Entry point, three-step workflow, decisions waiting, quick reference |
| [README.md](README.md) | Five-minute overview, roles, statistics, philosophy |
| [BACKEND-OS-COMPLETE.md](BACKEND-OS-COMPLETE.md) | This index |
| [ARTIFACT_INDEX.md](ARTIFACT_INDEX.md) | Deep phase descriptions, reading orders, keywords, status roll-up |
| [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) | Machine, repo, database, contract and test setup |
| [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md) | The self-contained build guide |

## 3. Statistics

| Measure | Count |
| --- | --- |
| Files | 15 |
| Consumers | 7 |
| Business rules | 42 |
| Assumptions / open decisions | 10 / 6 |
| Flows | 19 |
| Entities / invariants | 15 / 12 |
| Endpoint IDs / operations | 39 / 57 |
| Error codes | 35 |
| Services (pure) | 23 (5) |
| Integration contracts | 14 |
| Reconciliation items | 14 |
| Sprints / weeks | 9 / 18 |
| QA items | 138 |

## 4. ID registry

| Prefix | Meaning | Range | Home |
| --- | --- | --- | --- |
| `C-` | Consumers | C-01 – C-07 | [Phase 1 §5](phase-1-service-vision.md#5-consumers-and-actors) |
| `G-` | Goals | G-01 – G-07 | [Phase 1 §4](phase-1-service-vision.md#4-business-goals) |
| `BR-` | Business rules | BR-01 – BR-42 | [Phase 1 §7](phase-1-service-vision.md#7-business-rules) |
| `A-` | Assumptions | A-01 – A-10 | [Phase 1 §14](phase-1-service-vision.md#14-assumptions) |
| `OD-` | Open decisions | OD-01 – OD-06 | [Phase 1 §15](phase-1-service-vision.md#15-open-decisions) |
| `F-` | Flows | F-01 – F-19 | [Phase 2](phase-2-flow-maps.md) |
| `D-` | Entities | D-01 – D-15 | [Phase 3 §2](phase-3-domain-model.md#2-entity-catalogue) |
| `INV-` | Invariants | INV-01 – INV-12 | [Phase 3 §4](phase-3-domain-model.md#4-invariants) |
| `E-` | Endpoints | E-01 – E-39 | [Phase 4](phase-4-api-surface.md) |
| `S-` | Services | S-01 – S-23 | [Phase 5](phase-5-service-blueprints.md) |
| `I-` | Integration contracts | I-01 – I-14 | [Phase 6](phase-6-integration-contracts.md) |
| `R-` | Reconciliation items | R-01 – R-14 | [Phase 7 §21](phase-7-backend-architecture.md#21-spec-vs-code-reconciliation) |
| `Q-` | QA items | Q-RE, Q-IV, Q-AZ, Q-SE, Q-PV, Q-DI, Q-CT, Q-ER, Q-PF, Q-CA, Q-RL, Q-OB, Q-OP, Q-DX | [Phase 9](phase-9-qa-checklist.md) |

IDs are never reused or renumbered.

## 5. Cross-references

```
Phase 1 (BR, C, A, OD)
   └─► Phase 2 flows cite BR, C
         └─► Phase 3 entities serve F
               └─► Phase 4 endpoints expose F over D
                     └─► Phase 5 services implement E, enforce BR
                           └─► Phase 6 contracts bound S at the edges
                                 └─► Phase 7 maps S, E, I onto folders and modules
                                       └─► Phase 8 gives every F, D, E, S, I a status
                                             └─► Phase 9 verifies BR, E, S, I, INV
```

| One home per fact | Phase |
| --- | --- |
| Business rules | 1 |
| Data at rest | 3 |
| Request and response shapes | 4 |
| Algorithms | 5 |
| Boundary behaviour | 6 |
| Code organisation | 7 |
| Status | 8 |

## 6. Included and not included

| Included | Not included (and where it lives) |
| --- | --- |
| Every backend capability in the spec | Page rendering, 3D viewer, configurator UI (frontend design OS) |
| Contracts for the admin dashboard | Admin dashboard screens (frontend design OS) |
| Blender export contract | Blender models and materials (Cage) |
| Data contract and type generation | Visitor accounts (non-goal in V1) |
| Assumptions and open decisions, flagged | Poster images for builds (post-V1) |

## 7. Spec coverage

Every section of the spec maps to an artifact.

| Spec section | Artifacts |
| --- | --- |
| Your scope | Phase 1 §3, BR-37 |
| Recommended stack, hosting on Vercel | Phase 1 §10, §13; Phase 6 I-03–I-07, I-12; Phase 7 §16 |
| Architecture, suggested modules | Phase 7 §3 |
| Data model, schema sketch | Phase 3 (D-01–D-13, reference schema) |
| Configuration rules and pricing | BR-07–BR-13; F-04; E-09; S-01, S-02 |
| API endpoints, conventions | Phase 4 |
| Saved builds | BR-14–BR-19; F-05, F-06; E-05, E-10; S-06, S-07 |
| Enquiries, admin dashboard | BR-20–BR-25; F-08, F-11, F-12, F-16; E-11, E-16–E-20; S-08–S-10 |
| Journal | BR-26–BR-31; F-09, F-13, F-17; E-06, E-07, E-21–E-26; S-11–S-14 |
| 3D asset delivery | BR-32–BR-36; F-07, F-15; E-04, E-33–E-36; S-15–S-17; I-03, I-05, I-14 |
| Security, validation | BR-38, BR-41; Phase 7 §19; Phase 9 Q-SE, Q-IV |
| Testing | Phase 8 §9; Phase 9 |
| Conventions | BR-42; Phase 7 §16, §17 |
| Milestones | Phase 8 §1–§2 |
| Decisions | Phase 1 §13 |

## 8. Version history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-24 | First generation from the spec of Nov 22, 2026; status checked against the code ported from `nest-setup` the same day |
