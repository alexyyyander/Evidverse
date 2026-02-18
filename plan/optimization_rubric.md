# Optimization Rubric

Last Updated: 2026-02-19
Purpose: score candidate tasks consistently for continuous optimization loops.

## 1. Scoring Formula

Use this formula for every candidate:

`Score = (Impact x StrategicFit x Confidence x Urgency x VisionAlignment) / (Effort + Risk + Dependency)`

Higher score means higher execution priority.

## 2. Dimension Definitions (1-5 Scale)

Impact:
- 1: local cosmetic improvement, minimal user/system effect
- 3: meaningful improvement to one key flow or one reliability axis
- 5: directly improves core product loop or prevents major regression

StrategicFit:
- 1: weak relation to current stage and product vision
- 3: aligned to one current stage objective
- 5: tightly aligned to current stage + north star metric

Confidence:
- 1: uncertain cause/solution, missing data
- 3: partial evidence from logs/tests/bug reports
- 5: strong evidence and clear implementation path

Urgency:
- 1: can wait with no near-term cost
- 3: should be addressed this sprint
- 5: blocks current stage progress or risks repeated incidents

VisionAlignment:
- 1: does not improve either core product thesis
- 3: improves one thesis indirectly
- 5: directly improves one or both core theses:
  - long-form visual consistency,
  - branch-based multi-world collaboration

Effort:
- 1: < half day
- 3: 1-2 days
- 5: multi-day cross-module change

Risk:
- 1: low blast radius, easy rollback
- 3: medium risk with manageable mitigation
- 5: high regression risk in core workflows

Dependency:
- 1: self-contained task
- 3: needs one external module/team/system dependency
- 5: multiple hard dependencies or sequencing constraints

## 3. Pillar Coverage Rules (Mandatory)

Each round candidate pool (>=10 tasks) must include:
- at least 4 tasks focused on long-form consistency,
- at least 4 tasks focused on branch/fork/merge collaboration,
- remaining tasks may target reliability/performance/tooling.

If a task cannot be mapped to either pillar, StrategicFit must be capped at 2.

## 4. Selection Rules Per Round

- Build a candidate pool of at least 10 tasks.
- Compute score for each candidate before selection.
- Select 1-3 tasks with highest score where:
  - at least one task has Effort <= 2,
  - average Risk of selected tasks <= 3,
  - at least one selected task strengthens long-form consistency controls,
  - at least one selected task strengthens collaboration workflow,
  - selected tasks collectively align to current stage goals.
- If two tasks have similar score, pick the one with lower dependency first.

## 5. Priority Bands

- P0: Score >= 12 and Urgency >= 4
- P1: Score 8-11.9
- P2: Score 5-7.9
- P3: Score < 5

P0 and P1 should dominate round execution unless there is explicit exploratory intent.

## 6. Task Card Template

Use this schema in round planning:

| Task | Pillar | Area | Impact | StrategicFit | Confidence | Urgency | VisionAlignment | Effort | Risk | Dependency | Score | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Example: enforce segment continuity binding validation | consistency | backend/worker | 5 | 5 | 4 | 4 | 5 | 2 | 2 | 2 | 22.2 | Protects long-form coherence |
| Example: branch merge attribution completeness checks | collaboration | backend/frontend | 5 | 5 | 4 | 4 | 5 | 3 | 2 | 2 | 18.2 | Protects multi-world collaboration |

## 7. Definition of Done (Optimization Task)

- code change merged in correct module boundaries,
- relevant checks pass (or documented test gap with mitigation),
- measurable expected outcome recorded in `plan/loop_log.md`,
- impact is mapped to at least one core thesis,
- follow-up tasks listed when residual risk remains.
