# Continuous Optimization Loop SOP

Last Updated: 2026-02-19
Goal: keep optimization work continuously aligned with product vision and current stage delivery.

## 1. Required Inputs

Every round must read:
- `plan/current_stage&FAQ.md`
- `plan/product_vision.md`
- `plan/architecture_map.md`
- `plan/optimization_rubric.md`
- `plan/loop_log.md`

Useful supporting context:
- `docs/current_code_framework_report_zh.md`
- `docs/architecture.md`
- `docs/developer_guide.md`

## 2. Standard Round Workflow

1. Baseline scan:
- identify user-flow pain points, reliability issues, regression risks, and delivery blockers.

2. Build candidate pool:
- propose at least 10 tasks from current code and stage objectives.
- score each task using `plan/optimization_rubric.md`.
- ensure coverage for both pillars:
  - long-form visual consistency,
  - branch-based multi-world collaboration.

3. Select execution set:
- pick top 1-3 tasks with best score/risk balance.
- prefer at least one low-effort, high-leverage task.
- do not select tasks that only improve cosmetic UI without pillar impact.

4. Implement:
- make code changes directly.
- keep module boundaries intact (see `plan/architecture_map.md`).
- preserve split between text lane (LLM) and visual lane (ComfyUI/API providers).

5. Validate:
- run relevant lint/typecheck/tests.
- document pass/fail and unrun gaps.

6. Review:
- summarize impact, cost, risks, and product-vision alignment.
- append round record to `plan/loop_log.md`.

7. Queue next round:
- output at least 5 next candidate tasks with preliminary priority.

## 3. Execution Constraints

- Never optimize in a way that breaks branch/commit collaboration semantics.
- Never bypass character/scene/frame reference binding when continuity is required.
- Prefer reversible, test-backed increments over large speculative rewrites.
- If high-risk or high-uncertainty, split into discovery task + implementation task.
- Keep each round focused enough to complete and verify in one session.

## 4. Stop Conditions

Stop or pause the loop when any condition is met:
- Current stage P0/P1 backlog is cleared.
- North star and guardrail metrics meet agreed thresholds.
- Two consecutive rounds produce low measurable return.
- Remaining tasks are blocked by product decisions or external dependencies.

## 5. Prompt Template (for Codex)

Use this prompt to run the next round:

```text
继续优化 loop。请先读取：
- plan/current_stage&FAQ.md
- plan/product_vision.md
- plan/architecture_map.md
- plan/optimization_rubric.md
- plan/loop_log.md

按以下步骤执行并落地代码：
1) 识别问题并构建 >=10 个候选任务
2) 按 rubric 打分并排序
3) 候选任务必须覆盖两条主线：
   - 长视频人物/场景一致性
   - Branch 协作的平行宇宙创作
4) 执行前 1-3 个任务（直接改代码）
5) 对视觉链路优先保证 ComfyUI 本地可跑，同时保留 API 兼容抽象
6) 运行相关验证并汇报结果
7) 追加写入 loop_log
8) 给出下一轮 >=5 个候选任务
```
