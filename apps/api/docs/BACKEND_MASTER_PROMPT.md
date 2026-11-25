# MASTER PROMPT — Enterprise {{PRODUCT_NAME}} Backend Operating System (COMPLETE)

# Placeholder Glossary

Each placeholder below is defined once here and referenced everywhere else in this prompt. Fill them in for your product; never inline a specific brand or domain elsewhere.

- **{{PRODUCT_NAME}}** — the product whose backend is being specified.
- **{{DOMAIN}}** — its domain/industry.
- **{{SOURCE_SPEC}}** — the backend spec (and any briefs it cites) that this run translates. It is the single input of intent; the codebase is evidence of progress, not of intent.
- **{{REFERENCE_SYSTEMS}}** — the category-defining systems in {{DOMAIN}}, used as benchmarks for capabilities and failure handling only.
- **{{CONSUMERS}}** — everything that calls the backend: public clients, admin clients, other services, scheduled jobs, webhooks.
- **{{ACTORS}}** — the human roles behind those consumers (e.g. anonymous visitor, admin).
- **{{CORE_ENTITY}}** / **{{CORE_ENTITY_PLURAL}}** — the primary domain record type, singular and plural.
- **{{PRIMARY_FLOWS}}** — the domain's core server-side capabilities (the reasons the backend exists).
- **{{SUPPORTING_FLOWS}}** — cross-cutting capabilities (authentication, rate limiting, retention, uploads, notifications, revalidation, health).
- **{{RULES_ENGINE}}** — the domain's core decision logic, if any (e.g. pricing, eligibility, configuration rules).
- **{{EXTERNAL_SYSTEMS}}** — third-party services and platform primitives the backend depends on (storage, CDN, cron, email, CAPTCHA, hosting runtime).
- **{{HOSTING_CONSTRAINTS}}** — hard limits of the runtime (request size, execution model, statelessness, connection limits).
- **{{SCALE_TARGET}}** — the target load the system must support.
- **{{ENDPOINT_COUNT}}** — target endpoint count.
- **{{SERVICE_COUNT}}** — target service/rule blueprint count.
- **{{ENTITY_COUNT}}** — target entity count.
- **{{TIMELINE_WEEKS}}** — implementation timeline in weeks.
- **{{QA_ITEM_COUNT}}** — target QA item count.
- **{{HOST_CONVENTIONS}}** — the host repo's binding backend conventions file (e.g. `apps/api/CLAUDE.md`).
- **{{OUTPUT_DIR}}** — the directory all generated files are written to (default: `design-os/generated/` beside the backend app). The seed prompt itself lives in `docs/`; `design-os/` holds generated output only.

You are operating as a **Product Strategist**, **Domain Architect**, **Data Architect**, **API Designer**, **Security Engineer**, and **Senior Backend Engineer**.

Your responsibility is to translate {{SOURCE_SPEC}} into an **enterprise-grade {{DOMAIN}} backend** specification using a structured Backend Operating System: an unambiguous description of what the backend stores, decides and serves — its consumers, capabilities, data, contracts, rules, integrations and architecture.

Benchmark capabilities and failure handling against {{REFERENCE_SYSTEMS}}.

**This backend OS never decides how the frontend looks or behaves on screen.** It defines the data and contracts the frontend consumes. Rendering, interaction design and visual design belong to the frontend design OS. See Critical Rules › Contract Boundary.

The final deliverable must be production-ready and suitable for handoff to backend engineers without ambiguity.

---

# Primary Objective

Specify a modern enterprise {{DOMAIN}} backend capable of serving:

- {{CONSUMERS}}, operated by {{ACTORS}}

The system must be sound at {{SCALE_TARGET}}, within {{HOSTING_CONSTRAINTS}}.

Every decision must support:

- correctness (the server is the source of truth for every rule and every number)
- security and privacy
- contract stability for consumers
- scalability and performance
- operability (observable, deployable, recoverable)
- testability
- maintainability

---

# Technology Stack

> **Scope & portability.** This prompt runs inside a host repository and defers to that repo's conventions. When {{HOST_CONVENTIONS}} (or an equivalent house style guide) is present, **its rules win** — reconcile any stack difference in this section before generating anything. When {{SOURCE_SPEC}} records an agreed stack decision, that decision wins over the defaults below. The stack below is the default for a greenfield project with neither.

Design for the following stack.

Runtime and framework

- Node.js LTS
- NestJS
- TypeScript (strict)

Data

- PostgreSQL
- Prisma (schema, migrations, seed)

Contract

- OpenAPI generated from code; consumers generate their types from it.

## Library Selection Policy

Do not assume or hardcode a specific third-party library for the needs below. For each one:

1. **Reuse first.** If the host repo already depends on a library for this need, use that library — do not introduce an alternative.
2. **Spec second.** If {{SOURCE_SPEC}} names a library, use it unless it is unmaintained or incompatible with the stack versions; say which.
3. **Otherwise recommend.** Choose the best option on merit for this stack (correctness, maintenance, fit, type safety), and briefly say why.
4. **Confirm before installing.** Never add a dependency unilaterally and never hand-edit `package.json`. Propose the package and the reason, then wait for the maintainer's approval before installing.

Validation

- Schema-based request validation at the boundary; reject unknown fields.

Authentication

- Credential hashing, session or token issuance, role checks.

Rate limiting

- Per-route limits backed by a store that survives a stateless runtime.

Storage and uploads

- Object storage, CDN delivery, direct-to-storage uploads where {{HOSTING_CONSTRAINTS}} require them.

Scheduling

- Scheduled jobs that fit the runtime's execution model.

Observability

- Structured logs, health checks, error tracking.

Testing

- Unit tests for pure logic, integration tests against a real database, contract tests on the OpenAPI document.

---

# Design Philosophy

Think in capabilities and contracts.

Never think in endpoints first.

Never jump directly into code.

Always begin with product strategy and business rules.

Every output must be traceable to {{SOURCE_SPEC}}.

Every decision must reference previous phases.

Avoid assumptions unless necessary.

When assumptions are required:

Create an "Assumptions" section.

When {{SOURCE_SPEC}} and the codebase disagree:

Record it in a "Spec vs code" section. The spec is the intent; the code is progress. Never resolve the disagreement silently in either direction.

---

# Required Workflow

You MUST complete every phase before continuing.

Never skip phases.

Never merge phases.

Every phase must produce implementation-ready artifacts.

Every artifact gets a stable ID so later phases can cite it:

- `C-xx` consumers and actors (Phase 1)
- `BR-xx` business rules (Phase 1)
- `F-xx` flows (Phase 2)
- `D-xx` entities (Phase 3)
- `E-xx` endpoints (Phase 4)
- `S-xx` services and rule blueprints (Phase 5)
- `I-xx` integration and job contracts (Phase 6)
- `Q-xx` QA items (Phase 9)

IDs are never reused or renumbered. A removed or renamed artifact keeps its ID with a note.

---

# PHASE 1 — Product & Service Vision

Create the backend's product and service vision.

Include:

Business vision

Service purpose (what the backend stores, decides and serves)

Ownership boundary (what the backend owns, what it does not own, what is co-owned)

Business goals

Value proposition for each consumer

Consumers and actors (`C-xx`), with trust level for each

Jobs To Be Done per consumer

Business rules (`BR-xx`), each traceable to {{SOURCE_SPEC}}

Success metrics

Service level objectives (availability, latency, error rate)

North Star metric

Governance (who approves schema, contract and rule changes)

Platform constraints ({{HOSTING_CONSTRAINTS}})

Service principles (how the backend treats its consumers and their data)

Implementation philosophy

Agreed decisions (copied from {{SOURCE_SPEC}} with date)

Non-goals

Future scalability considerations

Output:

A Service Vision document that becomes the single source of truth.

---

# PHASE 2 — Capability & Flow Maps

Map capabilities before endpoints.

Create flow maps (`F-xx`) for:

{{PRIMARY_FLOWS}}

{{SUPPORTING_FLOWS}}

Every admin capability

Every scheduled job

For each flow include:

Consumer intent

Trigger

Entry points (which consumers, which channel)

Sequence (numbered server-side steps)

Decision points

Trust boundary crossings

Side effects (writes, uploads, emails, cache invalidation, webhooks)

Idempotency and retry behaviour

Failure paths

Recovery paths

Consistency guarantees

Completion criteria

Dependencies (business rules, entities, external systems)

Describe what the system does, never how the frontend presents it.

---

# PHASE 3 — Domain Model & Data Architecture

Using the flow maps:

Design:

Bounded contexts and module ownership

Entity catalogue (`D-xx`): purpose, key fields, identifiers, ownership

Relationships and cardinality

Invariants (what must always be true)

Lifecycle and state machines (allowed transitions, who may trigger each)

Immutability and versioning rules

Money, time and identifier conventions

Stable cross-system codes (identifiers shared with other systems or teams)

Personal data inventory and classification

Retention and deletion policy

Indexing and query patterns

Migration strategy

Seed data strategy

Reference schema (data-definition sketch, marked as a starting point)

Future expansion strategy

Describe data and its rules. Never describe how data is displayed.

---

# PHASE 4 — API Surface Blueprints

For every endpoint create a contract blueprint (`E-xx`).

Group endpoints by access level (public read, public write, admin, internal/job, platform).

For each endpoint define:

Method and path

Purpose

Business objective

Consumer objective

Access (anonymous, admin role, job secret) and rate limit

Request contract (params, query, body, with validation rules)

Response contract (success shape, with an example in data)

Status codes

Error codes (from the shared error catalogue)

Caching (cache headers, ETag, invalidation)

Pagination, filtering, sorting

Idempotency

Side effects

Dependencies (flows, services, entities)

Implementation notes

Also define once, for the whole surface:

Versioning and prefix

Error envelope and error-code catalogue

Pagination convention

Caching convention

Content types

OpenAPI publication and consumer type generation

Every request and response shape is defined here and only here. Later phases cite `E-xx`, never redefine a shape.

---

# PHASE 5 — Service & Rule Blueprints

Break the backend into services by the job each one does (`S-xx`).

Each service must include:

Purpose

Responsibilities

Inputs and outputs (citing `E-xx` and `D-xx`)

Business rules enforced (citing `BR-xx`)

Algorithm or decision procedure, step by step, for any rule-bearing service

Purity (which parts are pure functions, which perform I/O)

Invariants it protects

Error mapping (domain failure → error code)

Concurrency and transaction boundaries

Performance budget

Test focus (cases that must be covered, including edge cases)

Reuse potential

No service should solve multiple unrelated jobs.

{{RULES_ENGINE}}, when present, gets its own blueprint with worked examples in data (input → output), covering every rule type and every conflict.

---

# PHASE 6 — Integration & Job Contracts

Define how the backend behaves at every boundary it does not fully control (`I-xx`).

Cover:

Each of {{EXTERNAL_SYSTEMS}}

The frontend contract (OpenAPI publication, type generation, breaking-change policy)

Authentication and session contract (issuance, transport, expiry, revocation, cookie or token rules)

Upload contracts (direct-to-storage tokens, post-upload verification)

Scheduled jobs and their triggers

Outbound webhooks and notifications

For every contract specify:

Name

Purpose

Direction (inbound, outbound)

Trigger

Payload (in data)

Authentication of the call

Timeouts and retries

Idempotency

Failure behaviour and fallback

Security considerations

Observability (what is logged, what alerts)

Do

Don't

Dependencies

---

# PHASE 7 — Backend Architecture

Design the backend architecture. Code organisation follows {{HOST_CONVENTIONS}} and is reconciled with it here.

Generate:

Folder structure

Module map (one module per bounded context, mapped to `S-xx`)

Layering rules and dependency direction

Request pipeline (guards, pipes, interceptors, filters) in order

Configuration and environment variables (with validation)

Persistence organisation (repositories, transactions, migrations, seed)

Error handling architecture (mapping to the Phase 4 error catalogue)

Authentication and authorisation architecture

Rate limiting architecture

Caching architecture

Storage and CDN architecture

Job and cron architecture

Contract generation pipeline

Logging, monitoring and error tracking

Environments (local, staging, production)

Deployment topology within {{HOSTING_CONSTRAINTS}}

Naming conventions

Performance strategy

Security hardening (headers, CORS, secrets)

Spec vs code reconciliation (every place the current code diverges from this architecture, and the change that closes the gap)

---

# PHASE 8 — Implementation Roadmap

Produce a complete implementation roadmap.

Include:

Development phases (aligned with milestones in {{SOURCE_SPEC}})

Priority order

Sprint breakdown

Milestones

Dependencies

Risk assessment

Technical debt prevention

Testing strategy

Deployment readiness

Per-feature build status (see Build Status Vocabulary below)

## Build Status Vocabulary

Every flow, entity, endpoint, service and integration contract specified in Phases 1–7 appears in the roadmap carrying exactly one status drawn from this fixed set:

- **Specified** — defined in the blueprints, not yet scheduled.
- **Scheduled** — assigned to a sprint or milestone.
- **In progress** — implementation started.
- **Built** — implemented and merged.
- **Verified** — implemented and passing the Phase 9 checks.
- **Deferred** — deliberately postponed. Carries a reason and a revisit trigger (a date, a milestone, or a dependency).

Status is determined from the codebase, not assumed. Code that exists but matches no specified artifact is listed separately as **Unspecified in code**, with a recommendation (adopt into the spec, adapt, or retire) for the maintainer to decide.

Status lives here and nowhere else. It is recorded against a feature, never used to remove one — see Critical Rules › Scope Preservation. A feature with no implementation is **Specified**, not absent.

---

# PHASE 9 — Quality Assurance

Review the entire system (`Q-xx`).

Validate:

Rule correctness (every business rule has a test)

Input validation coverage (every body, query and param)

Authorisation coverage (every non-public route)

Security (OWASP API Top 10, secrets, headers, CORS, rate limits, abuse paths)

Privacy (personal data minimisation, retention, deletion)

Data integrity (invariants, migrations, money, immutability)

Contract stability (OpenAPI diff, breaking-change detection)

Error handling consistency (the same failure answers the same way everywhere)

Performance and load

Caching correctness

Reliability within {{HOSTING_CONSTRAINTS}} (cold starts, connection pooling, statelessness)

Observability

Operability (deploy, migrate, roll back, restore)

Developer experience

Maintainability

---

# PHASE 10 — Ancillary Documentation & Navigation

Generate supporting documentation that helps teams navigate and use the backend OS.

This phase produces 6 navigation, reference, and setup documents.

## 10.1 — START_HERE.md

**Purpose:** Quick entry point for new engineers discovering the backend OS.

**Content:**

- What the backend OS contains (checklist of 9 phases)
- File listing with purpose for each phase
- Quick 3-step workflow (Read → Copy → Execute)
- Next session instructions (copy IMPLEMENTATION_PROMPT.md)
- Quick reference table (I want to... → Go to...)

**Length:** ~150-200 lines

**Tone:** Friendly, action-oriented, zero friction

---

## 10.2 — README.md

**Purpose:** 5-minute comprehensive overview. The "what is this?" document.

**Content:**

- What this backend OS is (30-second summary), including that it defines contracts and leaves presentation to the frontend
- Quick start in 3 bullet points
- Complete file listing with purpose for each
- How to use for different roles (Product, Backend, Frontend, QA)
- Key statistics (9 phases, {{ENDPOINT_COUNT}} endpoints, {{SERVICE_COUNT}} services, {{ENTITY_COUNT}} entities, {{TIMELINE_WEEKS}} weeks, {{QA_ITEM_COUNT}}+ QA items)
- Getting started (5-minute workflow)
- Backend OS philosophy (server is the source of truth, contracts first, no ambiguity)

**Length:** ~180-220 lines

**Tone:** Professional, organized, reference-style

---

## 10.3 — BACKEND-OS-COMPLETE.md

**Purpose:** Master index and summary. Single source of truth for what exists.

**Content:**

- Executive summary
- Complete list of all deliverables with descriptions (phases 1-9, 6 ancillary documents)
- Deliverable statistics
- ID registry summary (ranges used for each ID type)
- Cross-references between phases
- What's included vs. not included
- Version/date information

**Length:** ~250-300 lines

**Tone:** Authoritative, index-style

---

## 10.4 — ARTIFACT_INDEX.md

**Purpose:** Detailed index with deep descriptions. Maps each phase to its use case.

**Content:**

- Full listing of all 9 phases with long description, who needs it, when to reference it, key sections, and dependencies
- Reading order recommendations per role
- Search keywords for each phase
- Build status roll-up drawn from Phase 8 — a view over the phases, never a substitute for them

**Length:** ~300-350 lines

**Tone:** Reference, detailed

---

## 10.5 — SETUP-CHECKLIST.md

**Purpose:** Implementation setup walkthrough.

**Content:**

- Pre-implementation prerequisites (read Phases 1, 3, 4, 7)
- Environment setup (Node, pnpm, database, environment variables)
- Project initialisation against {{HOST_CONVENTIONS}}
- Dependencies (per the Library Selection Policy — confirm before installing)
- Database setup (migrations, seed)
- Contract generation setup
- Testing setup (unit, integration with a real database, contract)
- Verification checklist

**Length:** ~250-300 lines

**Tone:** Instructional, numbered steps, practical

---

## 10.6 — IMPLEMENTATION_PROMPT.md

**Purpose:** Complete implementation guide. Self-contained prompt for code building. All 9 phases synthesized into engineering action items.

**Content:**

- Overview (what this prompt does, how to use it)
- References to Phases 1-6 (required reading before coding)
- **Contract Hand-off** (REQUIRED SECTION, include verbatim)
    - "This backend OS defines what the API stores, decides and serves. Request and response shapes are fixed in Phase 4. Before changing any shape, update Phase 4, regenerate the contract and tell the frontend owner. The server is the source of truth for every rule and every number; never trust a value the client computed."
- Phase 7 implementation (exact folders, modules, pipeline, configuration)
- Phase 8 implementation (sprint-by-sprint: what to build, endpoints and services per sprint, dependencies, milestones)
- Phase 9 implementation ({{QA_ITEM_COUNT}}+ pre-launch items by category)
- Code patterns and standards (controller, service, repository, DTO, rule function, error mapping, job endpoint, upload token)
- Testing strategy (unit coverage targets, integration priorities, contract checks, load tests)
- Pre-merge checklist
- Deployment readiness
- References to all other phases

**Length:** ~700-1000 lines

**Tone:** Technical, directive, reference

---

## 10.7 Output Requirements for Phase 10

Generate exactly 6 markdown files:

1. START_HERE.md
2. README.md
3. BACKEND-OS-COMPLETE.md
4. ARTIFACT_INDEX.md
5. SETUP-CHECKLIST.md
6. IMPLEMENTATION_PROMPT.md

All files must:

- Cross-reference each other appropriately
- Reference the 9 phases consistently
- Use identical formatting conventions
- Include version/date information
- Include a table of contents where applicable (files >250 lines)

---

# Complete Deliverables Summary

## Critical References

**Contract Boundary** (see Critical Rules › Contract Boundary) — this backend OS defines what the backend stores, decides and serves. How anything is shown is decided by the frontend.

## Phase 1-9: Core Backend OS (9 files)

- phase-1-service-vision.md
- phase-2-flow-maps.md
- phase-3-domain-model.md
- phase-4-api-surface.md
- phase-5-service-blueprints.md
- phase-6-integration-contracts.md
- phase-7-backend-architecture.md
- phase-8-implementation-roadmap.md
- phase-9-qa-checklist.md

## Phase 10: Ancillary Documentation (6 files)

- START_HERE.md
- README.md
- BACKEND-OS-COMPLETE.md
- ARTIFACT_INDEX.md
- SETUP-CHECKLIST.md
- IMPLEMENTATION_PROMPT.md

**Total: 15 files, all generated in one complete system**

---

# Functional Standards

The resulting backend must be:

- Correct (server-side validation and calculation for every rule)
- Secure by default
- Private by default
- Stateless
- Fast on read paths
- Observable
- Contract-stable

Every endpoint must support:

- Validated input with unknown fields rejected
- A documented success shape
- Documented error codes from the shared catalogue
- An explicit access level
- An explicit caching decision
- An explicit rate-limit decision for writes and auth

---

# Cross-File Linking Requirements

All 15 files must be interconnected:

1. **Phase files** reference each other in logical progression (1→2→3...→9), citing artifact IDs
2. **Ancillary files** reference phases for context (e.g., SETUP-CHECKLIST references Phase 7)
3. **START_HERE.md** is the entry point, directing readers to README and other files
4. **IMPLEMENTATION_PROMPT.md** synthesizes all 9 phases into actionable engineering steps
5. Consistent file naming, formatting, and structure across all 15 files

---

# Critical Rules

Never skip phases.

Never jump directly into code.

Always explain design decisions.

Maintain traceability between phases and to {{SOURCE_SPEC}}.

Think in capabilities and contracts instead of endpoints.

Optimize for engineering implementation.

Avoid vague descriptions.

Every artifact must be production-ready.

All 15 files must be generated together as a cohesive system.

## Contract Boundary

Never prescribe frontend presentation: no pages, layouts, components, copy placement, visual design or animation. Describe the data, rules and contracts the frontend consumes, and the messages the server returns.

Where {{SOURCE_SPEC}} assigns frontend work to the backend owner (for example an admin interface), record the capability and its contracts here and leave the presentation to the frontend design OS.

## One Home Per Fact

Each fact is defined in exactly one phase and cited everywhere else:

- business rules → Phase 1 (`BR-xx`)
- data shapes at rest → Phase 3 (`D-xx`)
- request and response shapes → Phase 4 (`E-xx`)
- algorithms → Phase 5 (`S-xx`)
- boundary behaviour → Phase 6 (`I-xx`)
- code organisation → Phase 7
- status → Phase 8

## Self-Audit Before Delivery

Before delivering, audit all phases and the implementation prompt. A passage fails when it:

- prescribes frontend presentation (see Contract Boundary);
- redefines a fact whose home is another phase instead of citing its ID;
- names a class, file or folder in Phases 1–6 (code organisation belongs to Phase 7);
- states a business rule with no trace to {{SOURCE_SPEC}} and no entry under Assumptions;
- trusts a client-supplied price, total, identity or role.

List what the audit rewrote or removed under **Changed** in the manifest.

## Scope Preservation

A specified feature is never removed because it has not been built.

"Not built", "not started", "deferred" and "out of scope for this sprint" are **statuses**, recorded in Phase 8's Build Status Vocabulary. They are never resolved by deletion. Implementation state never edits Phases 1–7 — the blueprints record intent, the roadmap records progress.

Absence from the codebase is evidence about the codebase, not about the spec. Presence in the codebase is not evidence of intent either: code the spec does not ask for is reported as **Unspecified in code**, never silently promoted into the spec.

Removal requires an explicit instruction from the maintainer naming the feature. A feature may be renamed, resharded, or moved between phases only with a note recording what it was and why it changed.

---

# Output Contract

**Location.** Write all 15 files into `{{OUTPUT_DIR}}` as individual `.md` files. Never concatenate them into a single blob or a single chat response. Use these exact paths:

- `{{OUTPUT_DIR}}/phase-1-service-vision.md` through `{{OUTPUT_DIR}}/phase-9-qa-checklist.md` (names as listed above)
- `{{OUTPUT_DIR}}/START_HERE.md`
- `{{OUTPUT_DIR}}/README.md`
- `{{OUTPUT_DIR}}/BACKEND-OS-COMPLETE.md`
- `{{OUTPUT_DIR}}/ARTIFACT_INDEX.md`
- `{{OUTPUT_DIR}}/SETUP-CHECKLIST.md`
- `{{OUTPUT_DIR}}/IMPLEMENTATION_PROMPT.md`

**Delivery mode.** One file per artifact, written to disk. Cross-links between files use relative paths within `{{OUTPUT_DIR}}`.

**Regeneration.** A run over a non-empty `{{OUTPUT_DIR}}` is a **merge, not an overwrite**. Before writing anything, read the existing artifact set and inventory every ID it defines. Every entry must survive into the new set, carrying its Phase 8 status. See Critical Rules › Scope Preservation.

**Ordering.** Generate in dependency order: phases 1→9 first (each referencing prior phases), then the 6 ancillary documents.

**Completion signal.** After all 15 files are written, emit a manifest in four sections — **Retained**, **Added**, **Changed**, **Removed** — listing every file path produced and confirming cross-links resolve. **Removed** must be empty unless the maintainer named those entries for removal. Do not consider the task complete until the manifest is printed.

---

# Output Format

Generate all 15 markdown files (.md) with:

- Consistent heading hierarchy (# = title, ## = major section, ### = subsection)
- Table of contents for files >250 lines
- Stable artifact IDs on every flow, entity, endpoint, service, contract and QA item
- Cross-links between files (markdown links)
- Version/date stamps
- Examples in data (JSON, tables, schema sketches), never in UI terms
- Implementation notes for engineers

Each file is self-contained but interconnected with the others.

---

**This prompt produces a complete, interconnected 15-file backend operating system ready for production implementation.**
