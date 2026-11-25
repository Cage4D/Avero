# Artifact Index — AVERO Backend OS

> v1.0 · generated 2026-11-24
> See also: [START_HERE](START_HERE.md) · [README](README.md) · [BACKEND-OS-COMPLETE](BACKEND-OS-COMPLETE.md)

## Table of contents

1. [Phase descriptions](#1-phase-descriptions)
2. [Reading orders by role](#2-reading-orders-by-role)
3. [Search keywords](#3-search-keywords)
4. [Build status roll-up](#4-build-status-roll-up)

---

## 1. Phase descriptions

### Phase 1 — [Service Vision](phase-1-service-vision.md)

**What it is.** The single source of truth for why the backend exists. It draws the ownership line (backend stores, decides, serves; Cage owns everything seen; the contract is co-owned), names the seven consumers and their trust levels, and states the 42 business rules every later phase cites. It records the agreed decisions from Nov 22, ten assumptions where the spec was silent (admin role, teaser behaviour, global `rulesVersion`, cookie plus refresh auth, notes as records, asset split, query-time publishing, showroom enum, rate limits, validate throttling), and six open decisions only the owners can make.

**Who needs it.** Everyone, first.
**When to reference.** Before any design argument; when a rule seems wrong; when writing a test name.
**Key sections.** §3 Ownership · §5 Consumers · §7 Business rules · §8 SLOs · §14 Assumptions · §15 Open decisions.
**Depends on.** The spec only.

### Phase 2 — [Flow Maps](phase-2-flow-maps.md)

**What it is.** Nineteen capability flows written as numbered server-side steps: nine public (lineup, model, configurator data, validate, save, restore, manifest, enquiry, journal), six admin (session, leads, builds, articles, catalogue, assets), two scheduled (retention, publishing) and two platform (health, contract). Each lists trust crossings, side effects, idempotency, failure and recovery paths. It ends with cross-flow guarantees (no trusted client numbers, version bump in the same transaction, immutable snapshots).

**Who needs it.** Backend developer, QA.
**When to reference.** When implementing a service; when writing integration tests; when an edge case appears.
**Key sections.** F-04 Validate · F-05 Save · F-10 Admin session · F-14 Catalogue edits · F-15 Asset shipping.
**Depends on.** Phase 1.

### Phase 3 — [Domain Model](phase-3-domain-model.md)

**What it is.** Fifteen entities in seven bounded contexts, extending the spec's sketch with `EnquiryNote`, `AssetVersion` + `AssetFile` (the spec's `Asset` split, with a reshape note), `CatalogueRevision` (the `rulesVersion` counter) and `AdminSession`. Twelve invariants, four state machines (enquiry, article, asset version, session), money and time conventions, stable cross-system codes, the PII inventory and retention policy, index plan, migration and seed strategy, and a full Prisma reference schema.

**Who needs it.** Backend developer; the frontend developer for codes and conventions.
**When to reference.** Writing migrations, the seed, repos; reviewing data changes.
**Key sections.** §2 Entities · §4 Invariants · §5 State machines · §8 Stable codes · §9 PII · §14 Schema.
**Depends on.** Phases 1–2.

### Phase 4 — [API Surface](phase-4-api-surface.md)

**What it is.** The contract. Surface-wide conventions (prefix, success envelope from the host, error envelope from the spec, cursor pagination, four cache classes, cookie auth, `Origin` check, OpenAPI), a catalogue of 35 error codes with HTTP statuses, and 39 endpoint blueprints with request rules and JSON examples, including the spec's validate response and asset manifest verbatim.

**Who needs it.** Backend and frontend developers, QA.
**When to reference.** Every DTO; every client call; every error branch.
**Key sections.** §1 Conventions · §2 Errors · §3 Index · E-09 Validate · E-11 Enquiry · §9 Catalogue · §10 Assets.
**Depends on.** Phases 1–3.

### Phase 5 — [Service Blueprints](phase-5-service-blueprints.md)

**What it is.** Twenty-three services, five pure. The rules engine gets an eight-step algorithm and six worked examples that reproduce the spec's own figures. Also: pricing with overflow guard; the AVERO Code generator (31-symbol alphabet, rejection sampling); snapshot loading with repeatable reads; catalogue guards (code-in-use, cycles, invariants, serialised version bumps); enquiry intake with honeypot and Turnstile; the enquiry transition table; journal visibility and TipTap allow-list; asset registration with variant diff and size budgets; GLB JSON-chunk parsing; login, refresh with reuse detection, and logout; rate-limit fail-open/closed policy; ETag recipes.

**Who needs it.** Backend developer, QA.
**When to reference.** While implementing each service; when writing unit tests.
**Key sections.** S-01 + worked examples · S-05 · S-06 · S-16 · S-18 · S-19.
**Depends on.** Phases 1–4.

### Phase 6 — [Integration Contracts](phase-6-integration-contracts.md)

**What it is.** Fourteen boundary contracts: the OpenAPI breaking-change policy and shared code lists; the two admin cookies and how dashboard middleware verifies them with the public key; GLB client uploads with scoped tokens; server image uploads; CDN headers, content types and CORS; two cron jobs; the revalidation webhook payload; the rate-limit store; Turnstile; admin alert email without visitor PII; Postgres pooled vs direct; logs and error tracking; and the Blender export contract.

**Who needs it.** Backend developer; frontend developer for I-01, I-02, I-08, I-14; Cage for I-14.
**When to reference.** Wiring any external service; agreeing cross-team behaviour.
**Key sections.** I-01 · I-02 · I-03 · I-08 · I-14.
**Depends on.** Phases 1–5.

### Phase 7 — [Backend Architecture](phase-7-backend-architecture.md)

**What it is.** The code layout, reconciled with the host conventions: folder tree, module map with one-way dependencies, ten-step request pipeline, environment variables, persistence and transactions, error architecture, the evolution of the existing auth module, rate limiting, caching, storage, `vercel.json` crons, contract CI, logging, three environments, naming, performance, hardening, dependencies to propose (none installed), and fourteen reconciliation items from today's code.

**Who needs it.** Backend developer.
**When to reference.** Before creating any file; when reviewing structure.
**Key sections.** §2 Folders · §5 Pipeline · §6 Env · §20 Dependencies · §21 Reconciliation.
**Depends on.** Phases 1–6 and the host conventions.

### Phase 8 — [Implementation Roadmap](phase-8-implementation-roadmap.md)

**What it is.** Nine two-week sprints aligned with the spec's four milestones, a dependency graph, and the status register for every flow, entity, endpoint, service and contract, checked against the code on 2026-11-24. Lists code the spec does not ask for, with recommendations. Risks, debt prevention, testing layers and deployment readiness (including the two items blocked on access: Vercel env keys and the production migration).

**Who needs it.** Both owners; backend developer every sprint.
**When to reference.** Sprint planning; status questions; before launch.
**Key sections.** §2 Sprints · §5 Status register · Unspecified in code · §10 Deployment readiness.
**Depends on.** Phases 1–7.

### Phase 9 — [QA Checklist](phase-9-qa-checklist.md)

**What it is.** 138 pass/fail checks across rule correctness, validation, authorisation, security, privacy, data integrity, contract stability, errors, performance, caching, reliability, observability, operability and developer experience, each with a method.

**Who needs it.** QA, backend developer.
**When to reference.** Writing tests; pre-merge; pre-launch.
**Key sections.** Q-RE · Q-AZ · Q-SE · Q-PV.
**Depends on.** Phases 1–8.

## 2. Reading orders by role

| Role | Order |
| --- | --- |
| Backend developer (first day) | START_HERE → Phase 1 → Phase 7 §21 → Phase 8 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → IMPLEMENTATION_PROMPT |
| Backend developer (per sprint) | Phase 8 sprint → the cited E, S, D, I → Phase 9 items → IMPLEMENTATION_PROMPT section |
| Frontend developer | README → Phase 4 → Phase 5 S-01 → Phase 6 I-01, I-02, I-08, I-14 → Phase 3 §7–§8 |
| 3D (Cage) | Phase 1 BR-03, BR-33–BR-36 → Phase 6 I-14 → Phase 2 F-15 |
| Product / owners | README → Phase 1 → Phase 8 §1–§2, §7 |
| QA | Phase 1 §7 → Phase 5 worked examples → Phase 9 → Phase 4 §2 |

## 3. Search keywords

| Phase | Keywords |
| --- | --- |
| 1 | ownership, consumers, trust, business rule, BR, SLO, North Star, governance, assumption, open decision, non-goal |
| 2 | flow, sequence, failure path, idempotency, side effect, retention job, publishing job, refresh, rollback |
| 3 | entity, invariant, state machine, lifecycle, rulesVersion, CatalogueRevision, PII, retention, index, Prisma, seed |
| 4 | endpoint, envelope, error code, pagination, cursor, ETag, Cache-Control, validate, AVERO Code, manifest, upload token |
| 5 | rules engine, requires, excludes, includes, default, single, conflict, fix, fixPrice, pricing, alphabet, rejection sampling, honeypot, Turnstile, variant check, refresh rotation |
| 6 | OpenAPI, breaking change, cookie, SameSite, Blob, client upload, CDN, content type, CORS, cron, revalidation, Redis, Sentry, Blender |
| 7 | folder, module, pipeline, guard, interceptor, filter, env var, transaction, vercel.json, reconciliation, dependency |
| 8 | sprint, milestone, status, Specified, Built, unspecified, risk, deployment |
| 9 | QA, check, test, OWASP, load test, drill |

## 4. Build status roll-up

A view over [Phase 8 §5](phase-8-implementation-roadmap.md#5-status-register); Phase 8 is authoritative.

| Kind | Total | Built | In progress | Specified |
| --- | --- | --- | --- | --- |
| Flows | 19 | 0 | 3 (F-10, F-18, F-19) | 16 |
| Entities | 15 | 0 | 1 (D-13) | 14 |
| Endpoints | 39 | 1 (E-39) | 2 (E-08, E-12) | 36 |
| Services | 23 | 0 | 2 (S-18, S-22) | 21 |
| Integration contracts | 14 | 1 (I-12) | 1 (I-01) | 12 |

Nothing is Verified or Deferred yet.
