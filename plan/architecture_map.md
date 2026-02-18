# Architecture Map (Optimization-Oriented)

Last Updated: 2026-02-19
Scope: optimization planning and execution guardrails

## 1. System Boundary

Evidverse runtime consists of:
- Frontend (`frontend/`): Next.js App Router, editor interaction, React Query and Zustand state.
- Backend (`backend/`): FastAPI APIs, domain services, auth, persistence orchestration.
- Worker (`backend/app/workers/`): Celery jobs for generation/export/publish workflows.
- AI Engine (`ai_engine/`): local/cloud model adapters and provider-specific clients.
- Infra services: Postgres, Redis, RabbitMQ, MinIO/S3.

Out of boundary for routine optimization rounds:
- replacing core framework stack,
- introducing new infra primitives without explicit stage approval.

Core product boundary focus:
- Long-form visual consistency (character, scene, segment continuity).
- Branch-based multi-world collaboration (fractal storyline evolution).

## 2. Module Contracts

| Module | Primary Paths | Owns | Depends On | Optimization Priority |
| --- | --- | --- | --- | --- |
| Frontend Routes + UI | `frontend/src/app`, `frontend/src/components` | user flows, view logic, interaction latency | API contracts, store/query shape | High |
| Frontend Data Layer | `frontend/src/lib/api`, `frontend/src/lib/queries`, `frontend/src/store` | request semantics, cache coherence, editor local state | backend schemas and endpoints | High |
| Backend API Layer | `backend/app/api/v1/endpoints` | transport validation, auth boundaries, response schemas | service layer | High |
| Backend Service Layer | `backend/app/services` | business rules, permission checks, workflow orchestration | ORM models, workers | High |
| Worker Layer | `backend/app/workers` | long tasks, retries, status updates, external tool calls | ai_engine, storage, broker | High |
| Data Models | `backend/app/models`, migrations | branch/commit/project semantics, durable references | Postgres | Critical |
| AI Adapter Layer | `ai_engine/adapters`, `ai_engine/local`, `ai_engine/clients` | provider abstraction, fallback behavior | external model services | Medium |

## 3. Domain Pipelines (Must-keep Separation)

Pipeline A: Text intelligence lane (LLM-first).
- idea expansion,
- script segmentation,
- character extraction and scene intent.

Pipeline B: Visual generation lane (reference-bound).
- character design image generation/upload and binding,
- clip keyframe planning (start-frame and end-frame),
- continuity linkage (segment N end-frame -> segment N+1 start-frame),
- video generation through ComfyUI (default local) or API-compatible providers.

Pipeline C: Collaboration lane (branch-first).
- branch divergence from canon,
- per-branch script and character transformation edits,
- merge decision with traceable lineage.

## 4. Critical User Flows and Reliability Budgets

Flow A: Idea -> Script -> Character/Storyboard -> Clip Generation -> Timeline placement.
- Goal: no blocking UI regressions and no silent task failure.
- Budget target: user-visible progress update within 2 seconds of polling cycle.

Flow B: Segment continuity.
- Goal: preserve character and scene consistency across adjacent segments.
- Budget target: continuity metadata is present for every segment transition that requests continuity.

Flow C: Branch collaboration -> Commit -> Merge decision.
- Goal: branch permission and attribution semantics stay correct.
- Budget target: no cross-branch workspace pollution; all writes scoped by branch.

Flow D: Publish/export pipeline.
- Goal: stable job execution with traceable failure logs and retries.
- Budget target: actionable error reason persisted for every failed job.

## 5. Architectural Red Lines

- Do not bypass service layer for non-trivial domain mutations.
- Do not store large binary assets directly in relational metadata tables.
- Do not introduce branch-agnostic writes in editor workspace APIs.
- Do not change public ID semantics to predictable identifiers.
- Do not generate continuity-required clips without reference binding records.
- Do not break provider abstraction by directly coupling UI to one backend vendor API.
- Do not treat branch variants as mutable edits on parent branch history.
- Do not merge optimization changes without at least scoped automated validation.

## 6. Standard Validation Gates Per Round

- Frontend scope changes: `cd frontend && npm run lint && npm run typecheck && npm run test:unit`
- Backend scope changes: `cd backend && python -m pytest -v` (or targeted pytest subset)
- Cross-boundary changes: run both sides' targeted checks.

If full test execution is infeasible, log exact gaps and risk in `plan/loop_log.md`.

## 7. Known Risk Register (Current Baseline)

- Branch collaboration complexity can create hidden permission regressions.
- Async worker retries may mask root-cause errors if logs are not normalized.
- Editor state grows quickly and may drift from API canonical data if contracts loosen.
- Mixed local/cloud model provider behavior can create inconsistent outputs.
- Continuity metadata gaps can silently degrade long-form visual coherence.
- Asset binding drift can break character identity persistence across branches.
