# Stage 09: 测试与工程化（质量门槛）

## 目标
建立可持续迭代的工程规范：统一脚本、测试分层、类型检查与格式化，保证“重构不怕改”。

## Todo List
- [ ] 补齐脚本：`typecheck`、`test`（unit/component）、`test:e2e`（Playwright），并与 `frontend/tests/run_tests.sh` 对齐。
- [ ] 引入 unit/component 测试框架（建议 Vitest + Testing Library），为核心组件与 hooks 补测试。
- [ ] 统一格式化与约束：prettier + eslint rules（含 Tailwind class 排序可选）。
- [ ] 增加 CI 门槛：lint + typecheck + test + e2e（按项目情况裁剪）。
- [ ] 建立测试用例优先级：Editor（关键交互）、Discover（feed/like）、Projects（create/fork）、Auth（login flow）。

## 验收标准
- 一条命令即可跑完前端质量检查（lint/typecheck/tests），并在 CI 中稳定执行。
- 重构阶段新增的关键模块具备最低覆盖度的回归保护。

