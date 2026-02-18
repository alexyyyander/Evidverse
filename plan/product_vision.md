# Product Vision (Execution Baseline)

Last Updated: 2026-02-19
Owner: Product + Engineering

## 1. Product Mission

Evidverse exists for the AI-video era where everyone can tell their own stories, but two hard problems block practical long-form creation:
- creators cannot reliably gather and maintain coherent visual materials for long stories,
- long narrative content breaks down without stable character and scene continuity.

Evidverse solves this as a "Video GitHub":
- make long-form generation consistency operational,
- make multi-person co-creation operational through branch/fork/merge workflows.

## 2. Product Thesis

The product is built on two core theses:

Thesis A: Long-form consistency is a pipeline problem, not only a model problem.
- Consistency is enforced through reusable character design references, scene anchors, and segment-to-segment frame continuity.
- Model capability still matters, but system-level constraints and data binding must reduce drift.

Thesis B: Multi-world storytelling is a collaboration problem, not only an editing problem.
- Different "parallel universes" should be represented as explicit branches.
- Script edits, character transformations, and visual variants should be first-class branch evolution events.
- The story graph should naturally grow like a fractal tree of versions and endings.

## 3. Primary User Problems

Problem 1: Character and scene consistency in long videos.
- Need stable character identity over many segments.
- Need scene continuity between adjacent clips.
- Need deterministic controls around first/last frame and reference nodes.

Problem 2: Collaborative creation across alternate worlds.
- Need safe divergence without losing base canon.
- Need traceable contribution lineage from script to final video.
- Need mergeable workflows for multiple narrative directions.

## 4. Core Workflow (Idea -> Story -> Character -> Video)

Stage 1 (Text-first by LLM):
1. Expand a short idea into story material.
2. Segment story into script blocks/scenes.
3. Extract main characters and scene requirements.

Stage 2 (Visual generation and editing):
1. Generate or upload character design images and bind them to character identities.
2. Generate clip start/end keyframes with continuity constraints.
3. Reuse previous clip end-frame as the next clip start-frame when continuity is required.
4. Generate video clips with bound character/scene references.
5. Allow user override by uploading assets and binding to characters/scenes.

Provider strategy:
- Default local visual workflow: ComfyUI (local-friendly, controllable).
- Keep API-compatible provider abstraction for cloud/local fallback where needed.

## 5. Core User Value

- Idea-to-script-to-video path with explicit continuity controls.
- Reusable character and scene assets reduce repeated prompt effort.
- Branch-based parallel worlds enable high-scale collaborative storytelling.
- Every version is attributable (who changed what, where, and why).

## 6. North Star and Supporting Metrics

North Star Metric:
- Number of branch storylines that reach publish-ready status per week.

Consistency Guardrail Metrics:
- Character consistency pass rate across adjacent segments.
- Scene continuity pass rate (segment N end-frame to segment N+1 start-frame).
- Re-generation rate caused by visual drift (lower is better).

Collaboration Metrics:
- Branch collaboration rate: active projects with >=2 contributors / active projects.
- Parallel-world branch depth and breadth per active root project.
- Merge decision lead time from branch creation.

Execution Metrics:
- Time to first playable draft (idea -> timeline preview) median <= 30 minutes.
- Publish success rate for branch HEAD outputs.

## 7. Non-Goals (Current Phase)

- Not building a generic media DAM product.
- Not chasing visual polish while consistency and collaboration workflows are unstable.
- Not hard-coupling the product to a single external provider runtime.
- Not introducing shortcuts that break branch attribution semantics.

## 8. Decision Principles

1. Continuity-first: prioritize controls that improve long-form consistency.
2. Branch-first: collaboration semantics must stay explicit and auditable.
3. Reference-first: generated clips must retain reference provenance (character/scene/frame inputs).
4. Local-first visuals: ComfyUI workflow should be first-class for local execution.
5. Workflow integrity over novelty: avoid features that bypass core pipeline stages.
6. Test-backed shipping: optimization is only complete with scoped validation.

## 9. Current Stage Alignment

Primary implementation context:
- `plan/current_stage&FAQ.md`
- `plan/stage_plan_dev_v2/README.md`
- `plan/stage_plan_frontend_v1/README.md`

Optimization loops must directly improve either:
- long-form consistency controls, or
- branch-based multi-world collaboration flow.

## 10. Review Cadence

- Weekly: review metric baselines and adjust optimization priority.
- Per round: append outcomes to `plan/loop_log.md`.
- Per stage transition: re-check non-goals and decision principles.
