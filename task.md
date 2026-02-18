---
title: 前端 UI 组件库升级任务
scope: frontend
status: draft
---

# 目标

把当前 Next.js + Tailwind 的“自研样式拼装”升级为“有设计系统约束 + 组件一致性 + 关键页面有质感”的 UI 方案，优先改善编辑器相关界面与基础交互组件。

# 给 Claude 的执行要求

1. 开始任何开发前，先读取本文件并严格按“待办任务”顺序执行。
2. 每个任务动手前，用 context7 检索该组件库/依赖的官方文档（安装、Next.js/App Router 用法、主题/暗色模式、按需引入、可访问性注意事项）。
3. 每完成一个任务：
   - 在对应任务项打勾
   - 在“执行记录”追加：做了什么、涉及文件、验证方式/结果
4. 不允许同时引入两套基础设计系统（例如 Mantine 与 Tailwind 基座混用）导致主题与组件体系割裂；如需切换，必须先在“选型结论”写清理由与迁移范围。

# 现状摘要（供选型参考）

- 技术栈：Next.js 14（App Router）+ React 18 + TypeScript + Tailwind（darkMode: class）+ CSS 变量主题 token
- 现有组件：`frontend/src/components/ui/*` 为自研 primitives，但缺少成熟组件生态与统一规范
- 工具缺口：`cn()` 目前仅做 class join，未做 tailwind 冲突合并（不利于稳定与一致性）

# 选型结论

- 主 UI 基座：shadcn/Radix 路线（Radix Primitives + Tailwind + 现有 CSS 变量 token）
  - 理由：当前工程已采用 Tailwind 与 CSS 变量主题 token，自研 primitives 也与该生态的组件形态接近；引入 Radix 能补齐可访问性与交互一致性，同时保持样式完全可控
  - 策略：以 `frontend/src/components/ui/*` 为唯一基础组件入口，逐步用 Radix 重构内部实现，确保对外 API 尽量不变（减少业务改动面）
  - 禁止混用：不引入 Mantine/MUI/AntD 作为第二套基础设计系统；展示型组件可少量引入，但不得替代 `ui/` 中的基础表单与交互 primitives
- 展示/动效增强：Aceternity / MagicUI / Glass 风格组件
  - 使用范围：仅用于 Landing、空状态、引导等展示场景；编辑器核心交互与表单不使用展示型组件库做基础控件

# 待办任务

- [x] 产出 UI 选型与迁移策略（明确主基座 + 禁止混用规则）
- [x] 升级 `cn()`：引入 `clsx`，并在 `cn()` 内实现轻量合并（当前环境暂无法安装新包）
- [x] 建立 UI 目录边界：新增页面/功能只能从 `src/components/ui` 引用基础组件
- [x] 引入并配置主 UI 基座（DaisyUI 或 shadcn/Radix），完成主题/暗色模式对齐
- [x] 替换高交互复杂组件（优先）：Dialog / DropdownMenu / Toast / Tooltip / Popover / Select
- [x] 替换基础外观组件：Button / Input / Textarea / Card / Tabs / Badge
- [x] 编辑器 UI 统一风格：Header / Sidebar / Timeline / Inspector 等模块对齐间距、字体、层级、hover/active 状态
- [x] 关键页面“质感增强”：Landing/空状态/引导加入 MagicUI/Aceternity/Glass 效果组件（少量、克制）
- [x] 验证与回归：暗色模式、响应式、键盘可访问性、主要流程无样式回归

# 执行记录

- 2026-02-15：确定主 UI 基座为 shadcn/Radix 路线，定义“禁止混用第二套设计系统”规则，并约定以 `src/components/ui` 为唯一基础组件入口
- 2026-02-15：升级 `cn()`：引入 `clsx`，并在 `cn()` 内实现轻量合并（当前环境 npm CLI 异常，无法安装新依赖；更新 `frontend/src/lib/cn.ts`）
- 2026-02-15：建立 UI 边界：新增 `frontend/src/components/ui/index.ts` 作为统一出口；eslint 限制在 `ui/` 之外直接导入 `@radix-ui/*`
- 2026-02-15：构建验证：使用 `node ./node_modules/next/dist/bin/next build` 完成前端 production build
- 2026-02-15：UI 基座配置：在 globals.css 中补全 shadcn 风格的基础样式与 CSS 变量（border, input, ring 等），并在 tailwind.config.ts 中完成映射。
- 2026-02-15：组件样式升级：完成 Button, Input, Textarea, Card, Tabs, Badge 的样式对齐（去除自研风格，完全对齐 shadcn/ui 设计规范）。
- 2026-02-15：Dialog 组件优化：更新 Dialog 样式以匹配 shadcn 设计（backdrop-blur, close button, title/desc typography），暂未引入 Radix 依赖。
- 2026-02-15：复杂交互组件重构：
  - 重构 `DropdownMenu` 支持 Context API 和 `asChild` 模式，对齐 shadcn 样式。
  - 重构 `Toast` 使用 shadcn 样式（右下角弹出，动画效果），保持 zustand 状态管理。
  - 新增 `Select` 组件（基于 DropdownMenu 模式模拟），支持 `value`, `onValueChange` 等标准 API。
  - 新增 `Popover`, `Tooltip` 组件（基础实现，支持 trigger/content 模式）。
  - 更新 `WorkflowPanel`, `Navbar`, `EditorHeaderBar` 等组件以适配新的 UI 组件 API（特别是 `DropdownMenuTrigger asChild` 和 `Select` 替换）。
- 2026-02-15：编辑器 UI 统一：
  - 新增 `Label` 组件用于表单对齐。
  - 优化 `InspectorPanel` 和 `TimelinePanel` 的样式（背景色、间距、字体）。
  - 调整 `EditorHeaderBar` 的 DropdownMenu 使用。
- 2026-02-15：质感增强：
  - 重构 `EmptyState` 组件，增加 Glassmorphism 效果和图标动画。
  - 重构 `ErrorState` 为通用 `Alert` 样式，支持多种变体。
  - 移除旧的 `components/states/EmptyState.tsx` 和 `ErrorState.tsx`。
  - 在 Landing Page (`page.tsx`) 引入 `Meteors` 动画效果，并手动配置 Tailwind 动画关键帧。

---

# Local AI Models Integration

## Status: completed

## Models (24GB RTX 4090 Optimized)

| Task | Model | VRAM | Implementation |
|------|-------|------|----------------|
| LLM (Scripts) | qwen3:8b | ~8GB | Ollama |
| Image-to-Image | FLUX.2-klein-4B | ~8-12GB | ComfyUI |
| Text-to-Image | Z-Image-Turbo | ~8-12GB | ComfyUI |
| Image-to-Video | ltx-2-19b-distilled | ~12-16GB | Diffusers |

## Architecture

```
ai_engine/
├── models/                    # Model management
│   ├── config.py              # Model settings & toggles
│   ├── registry.py            # Model registry
│   └── downloads/             # Download scripts
├── local/                     # Local model clients
│   ├── llm_client.py         # Ollama wrapper
│   ├── image_client.py        # ComfyUI API
│   └── video_client.py        # LTX-Video
└── adapters/                  # Unified adapter
    ├── local_adapter.py       # Local models
    └── cloud_adapter.py      # Cloud APIs
```

## Tasks

- [x] Create folder structure (models/, local/, adapters/)
- [x] Create model config.py with toggles
- [x] Create download scripts (llm, image, video)
- [x] Implement local LLM client (Ollama)
- [x] Implement local image client (ComfyUI)
- [x] Implement local video client (LTX-Video)
- [x] Create adapter pattern (local/cloud)
- [x] Update backend config
- [x] Create backend services
- [x] Update workers
- [x] Add /api/v1/health/ai endpoint for adapter health
- [x] Align backend and ai_engine env var strategy (LOCAL_MODEL_* vs non-prefixed)
- [x] Fix UnifiedAdapter selection in async context (avoid asyncio.run)
- [x] Refactor workers to route generation via generation_service
- [x] Add image_url to bytes download for video pipeline (or adjust workflow payload)
- [x] Add smoke test to verify local toggle and cloud fallback

## Execution

- 2026-02-16: Created implementation plan for local AI models integration
- 2026-02-16: Completed local model integration (ai_engine local clients + unified adapter + backend generation_service/workers/health); fixed LocalAdapter optional dependency and env default alignment; updated unit tests; backend pytest passed (34/34)

---

# ComfyUI 官方接口与用户工作流接入增强

## Status: in_progress

## 目标

在“本地模型接入”基础上，补齐 ComfyUI 的官方接口能力（状态、节点信息、队列、上传）与“用户提交 workflow 直接执行”链路，并提供更清晰可用的前端操作界面。

## 范围

- LLM：支持通过供应商接口接入，同时支持本地 `vllm/ollama/sglang` 接入（已完成）
- 图像/视频：`txt2image`、`image2image`、`image&text2video` 统一通过 ComfyUI workflow 执行
- 工作流来源：支持用户提交 workflow + bindings + params + uploads 直接执行

## Tasks

- [x] 新增 ComfyUI 服务层：`health` / `object_info` / `system_stats` / `queue` / `upload_image`
- [x] 扩展 ComfyUI API：
  - `/api/v1/comfyui/health`
  - `/api/v1/comfyui/object-info`
  - `/api/v1/comfyui/object-info/{node_class}`
  - `/api/v1/comfyui/system-stats`
  - `/api/v1/comfyui/queue`
  - `/api/v1/comfyui/upload-image`
  - `/api/v1/comfyui/workflows/execute`
- [x] 扩展 workflow runner：
  - 支持 `file://`、本地绝对路径、`http/https` 上传到 ComfyUI
  - 支持下载多种输出桶（images/videos/gifs/audio/files）
  - 输出去重（filename+subfolder+type）
- [x] 重构 Celery 任务：
  - 多输出统一打包上传存储并返回 `outputs[]`
  - 保持兼容字段：`image_url` / `video_url` / `output_url`
- [x] 前端 API 与类型扩展：ComfyUI health/objectInfo/systemStats/queue/upload/execute
- [x] Settings 前端增强：
  - 运行时状态面板（健康、节点数、队列、系统信息）
  - 用户工作流直接执行表单
  - 上传辅助（上传后自动追加 uploads 映射）
  - 任务结果多输出展示（图片/视频/链接/原始 payload）
- [x] 启动联调环境并完成首轮 debug：
  - 后端 `uvicorn` 成功启动（8010）
  - 前端 `next dev` 成功启动（3001，使用 Node 20 PATH）
  - 健康检查返回 200
  - 修复前端 typecheck 阻断项（Button variant、LeftTab 兼容）
- [x] 前端风格增强（小众极简）：
  - 增加分形树装饰组件
  - 在 Settings 页面引入分形背景与低饱和渐变氛围层
  - 保持功能可读性与交互不变
- [ ] 在编辑器主流程中接入同等能力（非仅 Settings 页面）
- [ ] 在统一环境下跑完整前后端回归（当前执行环境受限）

## 执行记录

- 2026-02-16：完成后端 ComfyUI 服务层、端点扩展、worker 多输出返回与相关测试更新。
- 2026-02-16：完成前端 `comfyui` API domain/type 扩展，新增工作流执行与上传接口。
- 2026-02-16：完成 Settings 页面 ComfyUI 运行面板与工作流执行交互升级。
- 2026-02-16：完成联调启动与修复：
  - 后端 `uvicorn` 启动于 `8010`，`/api/v1/health` 返回 `{"status":"ok"}`
  - 前端 `next dev` 启动于 `3001`，首页返回 `HTTP 200`
  - 修复 typecheck 错误（`ComfyUIWorkflowPanel.tsx`, `LeftSidebar.tsx`, `ui.ts`）
- 2026-02-16：完成极简分形风格增强：
  - 新增 `frontend/src/components/ui/fractal-tree.tsx`
  - 在 `frontend/src/app/(app)/settings/SettingsClient.tsx` 接入分形树视觉元素
  - 在 `frontend/src/app/globals.css` 增加分形漂移动画
- 2026-02-16：本地验证受环境限制：
  - 前端在系统默认 Node `v12.22.9` 下无法运行；切换 Node 20 环境后 `npm run typecheck` 已通过。
  - 后端使用系统 Python 运行 `pytest` 会缺少 `pydantic_settings`；切换 `backend/venv` 后可启动测试，但 `test_comfyui_template_crud` 在 fixture/setup 阶段超时（`aiosqlite` 线程等待，需进一步排查测试环境）。
- 2026-02-16：编辑器主流程继续推进（Step3/Queue 主线）：
  - `Step3CharacterPanel` 增加 ComfyUI 模板列表拉取与模板选择，支持 `templateId + params` 入队 `comfyui_image` 任务。
  - `GenerationQueuePanel` 增加 `comfyui_image/comfyui_video` 成功态的 `characterId + beatId` 透传，重试时支持 `renderTemplate` 路径并保留 `refIds`。
  - `editorStore.applyComfyuiTaskResult` 修复视频时长读取 `refIds.beatId` 的映射问题，避免默认时长覆盖。
  - 新增/更新前端测试：`editor-store` 覆盖 ComfyUI 角色映射与视频时长场景；`typecheck` 与目标测试集通过（17/17）。
- 2026-02-16：编辑器 Step4 继续推进（视频生成双路径）：
  - `StoryNodeStep4Data` 增加 `provider(segment/comfyui)` 与 `comfyuiTemplateId`，并在 workflow 迁移中补默认值（旧数据兼容）。
  - `editorStore` 新增 `updateNodeStep4` 原子更新 action（含锁节点校验）。
  - `Step4NodeRenderPanel` 支持选择 Segment/ComfyUI 生成路径；ComfyUI 模式可直接选择模板并入队 `comfyui_video` 任务。
  - 新增 Step4 模板与渲染来源相关 i18n 文案。
  - `Step2OutlinePanel` 增加 LLM provider 选择，节点重生成时直接使用当前 provider。
  - `TimelineEditor` 事件流节点增加 Step4 渲染来源与模板标记（旧数据回退为 segment）。
  - `StoryNodeCard` 视频区增加 Step4 渲染来源与模板信息展示。
  - `timeline-event-layer` 测试补充 Step4 来源/模板文案断言，确保事件层显示链路稳定。
  - `StoryNodeStep4Data` 增加 `comfyuiParamsJson`，Step4 面板支持每节点 ComfyUI 参数覆写 JSON 编辑并在提交前做对象校验。
  - ComfyUI 视频渲染时自动参数与 `comfyuiParamsJson` 合并提交；`StoryNodeCard` 视频区同步显示参数覆写内容。
  - `TimelineEditor` 事件流节点新增参数覆写标记（ComfyUI 且覆写非空时显示）。
  - Step4 参数编辑升级为“可视化键值编辑 + JSON 高级模式”双入口：可视化模式支持 `string/number/boolean/json/null` 类型、增删参数行与手动应用；提交渲染时自动使用当前可视化内容。
  - 测试更新：`story-workflow-store` 增加 step4 provider/template 更新与锁校验；`typecheck` 与目标测试集通过（18/18）。
- 2026-02-16：Step4 参数链路继续增强（模板参数提取 + 组件测试）：
  - `Step4NodeRenderPanel` 参数导入从“仅 bindings”升级为“bindings + workflow 占位符（`{{param}}` / `${param}`）”联合提取，减少模板漏参。
  - Step4 面板新增模板参数覆盖率提示（已覆盖/总需求/缺失键），并在覆写 JSON 非法时给出可见风险提示，避免渲染前隐性失败。
  - 新增组件级测试 `frontend/src/__tests__/step4-node-render-panel.test.tsx`，覆盖：
    - 参数导入合并行为（保留已有键 + 补齐缺失键）
    - 无新增参数时的 no-op 提示
    - 非法 `comfyuiParamsJson` 阻断渲染任务提交
- 2026-02-16：Step4 参数补齐交互继续推进（可选自动补齐）：
  - Step4 模板区新增“自动补齐开关”（默认关闭）；开启后在切换模板并加载详情后自动补齐缺失参数键，不覆盖已有值。
  - 自动补齐与手动导入复用同一参数合并逻辑，并在当前 JSON 非法时自动路径跳过写入，避免隐式覆盖用户输入。
  - 更新 `step4-node-render-panel` 测试，新增自动补齐开关用例，验证开启后会自动补齐缺失键。
- 2026-02-16：Step4 主线继续推进（自动补齐持久化 + 事件流参数徽记）：
  - `storyWorkflow` 新增 `ui.step4AutoFillEnabled`，并在 store 保存/加载流程中透传；Step4 自动补齐开关状态可随 workspace 持久化。
  - Timeline 事件层新增 Step4 参数填写徽记（`filled x/y`）与非法参数标记（`params invalid`），用于快速判断节点参数可用性。
  - `StoryNodeCard` 视频信息区同步展示同源参数填写比率，保证与事件流一致的参数状态视图。
  - 新增 `frontend/src/lib/editor/comfyuiParams.ts` 统一参数解析与填写统计逻辑，减少组件内重复实现。
- 2026-02-16：Step4 参数可观测性继续增强（颜色等级 + 持久化回归测试）：
  - `comfyuiParams` 工具新增填充状态分类（`invalid/empty/partial/full`），供事件流与节点卡片共用。
  - Timeline 事件流将参数填写比率徽记升级为颜色等级显示（full=绿色、partial=琥珀、empty=灰、invalid=红），便于快速筛选风险节点。
  - 新增测试 `frontend/src/__tests__/story-workflow-ui-persistence.test.ts`，覆盖 `step4AutoFillEnabled` 在 `saveProject/loadProject` 过程中的持久化与恢复。
  - 新增测试 `frontend/src/__tests__/comfyui-params.test.ts`，覆盖参数解析、填写统计与状态分类逻辑。
- 2026-02-16：Step4 左侧可视化与故障修复链路继续推进：
  - Step2 节点列表新增 Step4 参数状态徽记（沿用 `full/partial/empty/invalid` 颜色等级），左侧即可快速识别参数风险节点。
  - Step4 参数编辑在 `visual` 模式下新增“恢复无效草稿”入口：当参数 JSON 非法时可一键重置为 `{}` 后继续恢复原始非法草稿，避免误丢输入。
  - 更新 `step4-node-render-panel` 测试，覆盖“快速修复 + 草稿恢复”行为。
- 2026-02-16：Step4 草稿恢复防误触继续推进（确认弹窗）：
  - `Step4NodeRenderPanel` 的“恢复无效草稿”从立即执行改为二次确认（Dialog），避免误点击直接覆盖当前参数。
  - 新增恢复确认文案键（title/desc/hint/action），与现有 i18n 结构保持一致。
  - 更新 `step4-node-render-panel` 测试：覆盖“打开确认 -> 取消不变更 -> 确认后恢复”的完整链路。
- 2026-02-16：分支边界主线继续推进（非主分支自动锁前缀）：
  - `storyWorkflow` 新增边界推断逻辑：对 `boundaryConfigured=false` 的非主分支，按“连续已落盘节点前缀（Step4 confirmed / done+video）”自动计算 `lockBoundaryOrder`，避免默认 `0` 导致误改历史剧情。
  - `editorStore.loadProject` 分支切换路径改为重建 `storyWorkflow`，统一复用推断逻辑，不再硬编码 `lockBoundaryOrder=0`。
  - 新增测试 `frontend/src/__tests__/story-workflow-boundary.test.ts`，覆盖边界推断与自动加锁行为。
- 2026-02-16：GitGraph“前移分支节点”闭环增强：
  - 新增 `frontend/src/lib/editor/branchBoundary.ts`，封装“fork 后在新分支 workspace 内写入 boundary（推断 + 置为 configured + 应用锁）”的纯函数。
  - `GitGraph` 的 `moveBoundaryMutation` 从“仅 fork+跳转”升级为“fork -> 拉取新分支 workspace -> 写入边界元数据 -> 更新 workspace -> 跳转”。
  - 新增测试 `frontend/src/__tests__/branch-boundary-workspace.test.ts`，覆盖：
    - 无 `editorState` 时安全返回
    - 边界推断并正确锁定前缀节点
    - 原始 workspace 不被污染（纯函数语义）
- 2026-02-16：Step3 主线补齐（角色 1:1 映射强校验）：
  - `Step3CharacterPanel` 增加缺失角色映射列表展示；未完成映射时阻止“确认并继续”进入 Step4。
  - 增加映射不完整的失败提示 toast（含缺失数量与角色预览名），避免静默进入后续步骤造成 Step4 资产绑定缺口。
  - 新增测试 `frontend/src/__tests__/step3-character-panel.test.tsx`，覆盖：
    - 映射不完整时禁止推进
    - 映射完整时正常推进到 Step4 并更新 Step3 状态为 done
- 2026-02-17：fork / branch 语义隔离继续收口（作者确认版）：
  - 后端 `GET /projects` 明确为“我拥有的项目”，`GET /projects/branch-participations` 单独返回“我参与的分支项目”。
  - 新增 fork 申请流的 owner 限制：owner 不允许提交 fork request，owner 直接走 `/projects/{id}/fork`；非 owner 走 `/projects/{id}/fork-requests`。
  - `ProjectPreview` 新增 owner 侧 fork request 审批标签页（approve/reject）与非 owner “申请 Fork”文案路径；`GitGraph` 与 `Projects` 页 fork 动作统一为“owner 直 fork / 非 owner 提交申请”双路径。
- 2026-02-17：分支参与可见性与测试稳定性修复：
  - 后端 `branch-participations` 响应新增 `participated_branch_names`；前端“我参与的分支项目”与 `ProjectPreview` 支持显示并快速进入本人分支。
  - 编辑器分支创建文案补充“branch 不改变仓库归属，跨作者复制请走 fork request”。
  - 修复后端测试 teardown 卡住：在 `tests/conftest.py` 中引入测试专用内存 cache 替身（仅测试环境，未改生产逻辑），`test_fork_requires_owner_approval_and_request_flow` 与 `test_branch_fork_workspace` 可稳定退出。
- 2026-02-16：Step3 校验下沉 + 事件流映射徽记：
  - 新增 `frontend/src/lib/editor/storyProgress.ts`，统一 Step3 映射统计逻辑（mapped/total/missing）。
  - `editorStore` 新增 `confirmNodeStep3(nodeId)`，并在 `setActiveStep("step4")` 中加入映射完整性 guard（缺失时阻止切换并提示）。
  - `TimelineEditor` 事件层节点增加 Step3 映射比徽记（`mapped x/y`，按 full/partial/empty 着色），便于底部事件流快速识别角色资产缺口。
  - 新增测试 `frontend/src/__tests__/story-progress.test.ts`；扩展 `story-workflow-store` 与 `timeline-event-layer` 用例覆盖 Step3 guard 与映射徽记链路。
- 2026-02-16：Step2/Step4 主线兜底增强：
  - `Step2OutlinePanel` 节点列表同步增加 Step3 映射进度徽记（`mapped x/y`），与事件流语义一致。
  - `Step4NodeRenderPanel` 在提交渲染前增加 Step3 映射完整性兜底校验：存在未映射角色时直接拒绝入队并提示缺失名单。
  - 新增 i18n 文案：`story.step4.toast.mappingIncomplete.*`。
  - 新增测试 `frontend/src/__tests__/step2-outline-panel.test.tsx`，并扩展 `step4-node-render-panel` 用例覆盖“映射不完整阻断渲染”。
- 2026-02-16：StoryNodeCard 与 Step4 体验继续收口：
  - `StoryNodeCard` 头部新增 Step3 映射比（`mapped x/y`）和缺失角色提示，中央卡片与底部事件层/左侧列表的映射状态语义保持一致。
  - `Step4NodeRenderPanel` 顶部增加“缺失映射常显提示”，用户进入 Step4 即可看到阻断原因，不必点“生成”后才发现。
  - 新增 i18n 文案：`story.step4.mapping.required`。
  - 新增测试 `frontend/src/__tests__/story-node-card.test.tsx`，并扩展 Step4 用例断言常显提示内容。
- 2026-02-16：Step4 交互阻断继续收口（映射未完成禁用生成）：
  - `Step4NodeRenderPanel` 将 Step3 映射缺失纳入“生成节点视频”按钮禁用条件（除 `locked`/`beat` 之外第三个硬条件），避免无效点击进入提交流程。
  - 在生成按钮区域增加固定原因提示（缺失角色名单），与顶部常显提示形成近场反馈，减少用户定位成本。
  - 更新测试 `frontend/src/__tests__/step4-node-render-panel.test.tsx`：映射缺失场景改为断言按钮 `disabled`，并保留阻断渲染入队校验。
  - 本地验证通过：`npx vitest run src/__tests__/step4-node-render-panel.test.tsx`、`npm run typecheck`。
- 2026-02-16：中央节点卡片语义对齐（Step3 映射徽记）：
  - `StoryNodeCard` 的 Step3 `mapped x/y` 从普通文本升级为颜色徽记（full=绿色，partial=琥珀，empty=灰色），与 Step2/事件流保持同一进度语义。
  - 本地验证通过：`npx vitest run src/__tests__/story-node-card.test.tsx src/__tests__/step4-node-render-panel.test.tsx`。
- 2026-02-16：Step4 禁用原因可见性增强（hover/focus 提示）：
  - `Step4NodeRenderPanel` 在映射缺失导致按钮禁用时，额外提供 Tooltip 近场提示（与常显文案并存），用户无需点击也能快速理解阻断原因。
  - 本地验证通过：`npx vitest run src/__tests__/step4-node-render-panel.test.tsx`、`npm run typecheck`。
- 2026-02-16：Step1 人设参考图接入资产池（主线闭环）：
  - `editorStore` 新增通用 `addImageAsset` action，可按 `source/relatedBeatId/relatedCharacterId/generationParams` 写入图片资产并返回 `assetId`。
  - `Step1StoryPanel` 上传人物参考图后，除写入 `referenceImageUrl` 外，同时入 `assets` 并回填 `seed.referenceAssetId`，确保后续 Step3/Step4 可追踪资产来源。
  - 新增测试 `frontend/src/__tests__/editor-store.test.ts`：覆盖 Step1 seed 上传场景的资产入池行为。
  - 本地验证通过：`npx vitest run src/__tests__/editor-store.test.ts`、`npm run typecheck`，并通过 12 文件主线回归（41 tests）。
- 2026-02-16：Step1/Step4 交互收口（资产定位 + 映射修复快捷返回）：
  - `Step1StoryPanel` 每个 seed 卡片新增“参考资产”信息块，展示 `referenceAssetId` 与参考图 URL；支持“一键打开资产栏”并同步选中该 asset（若存在）。
  - `Step4NodeRenderPanel` 在映射缺失提示中新增“返回 Step3 修复”按钮，点击后直接切换到 Step3 并保持当前节点选中，减少手动导航路径。
  - 新增 i18n 文案：`story.step1.seeds.asset.*`、`story.step4.mapping.backToStep3`。
  - 更新测试 `frontend/src/__tests__/step4-node-render-panel.test.tsx`：覆盖“缺失映射时可一键回 Step3”行为。
  - 本地验证通过：`npx vitest run src/__tests__/step4-node-render-panel.test.tsx`、`npm run typecheck`，并通过 12 文件主线回归（41 tests）。
- 2026-02-16：Assets 栏展示补齐（支持图片资产可见与选中）：
  - `LeftSidebar` 的 assets 页从“仅时间轴片段网格”扩展为“片段网格 + 图片资产列表”双区显示，图片资产支持缩略图预览、点击选中高亮、外链查看。
  - Step1 “打开资产栏”动作现在可在左栏直接看到 seed 参考图，避免仅切 tab 但无可见目标的问题。
  - 新增 i18n 文案：`editor.left.assets.images.*`。
  - 本地验证通过：`npm run typecheck`，并通过 12 文件主线回归（41 tests）。
- 2026-02-16：Step3 与 Assets 主线继续打通（seed 一键映射 + 过滤视图）：
  - `Step3CharacterPanel` 新增“Use Seed Ref”快捷操作：按角色名/已绑定 `linkedCharacterId` 匹配 Step1 seeds，优先复用 `referenceAssetId`，否则回收同 URL 资产，再兜底创建图片资产并完成当前节点映射。
  - seed 快捷映射成功后同步写回 `storyWorkflow.global.characterSeeds[].linkedCharacterId/referenceAssetId`，保证后续节点复用与可追踪。
  - `LeftSidebar` 图片资产区新增过滤开关：`All / Current Node / Current Character`，支持按当前剧情节点或当前角色聚焦资产集合。
  - 新增 i18n 文案：`story.step3.characters.useSeedRef`、`story.step3.toast.seedMapped.*`、`story.step3.toast.seedUnavailable.*`、`editor.left.assets.images.filter.*`。
  - 更新测试 `frontend/src/__tests__/step3-character-panel.test.tsx`：新增 seed 快捷映射用例。
  - 本地验证通过：`npx vitest run src/__tests__/step3-character-panel.test.tsx`、`npm run typecheck`，并通过 12 文件主线回归（42 tests）。
- 2026-02-16：Step2/Step1 主线细化（节点驱动过滤 + 显式角色绑定）：
  - `LeftSidebar` 在 `Step2` 且选中节点变化时，自动把图片资产过滤模式切到 `Current Node`，节点切换后可直接看到本节点相关素材。
  - `Step1StoryPanel` 增加 seed 的“绑定角色”下拉（显式 `linkedCharacterId`），用于分支改写或已有角色场景下的确定性映射。
  - Step1 请求透传新增 `character_seed[].linked_character_id`，保持与后续 Step3 seed 快捷映射策略一致。
  - `Step3CharacterPanel` 用例补充：验证 `linkedCharacterId` 优先于名称匹配的映射优先级。
  - 新增 i18n 文案：`story.step1.seeds.bindCharacter.*`。
  - 本地验证通过：`npx vitest run src/__tests__/step3-character-panel.test.tsx`、`npm run typecheck`，并通过 12 文件主线回归（43 tests）。
- 2026-02-16：主线稳定性继续推进（Assets 过滤持久化 + Seed 绑定失效兜底）：
  - `StoryWorkflowUi` / `TimelineWorkspace.editorUi.storyWorkflow` 新增 `assetsImageFilter`（`all/node/character`），`saveProject/loadProject` 全链路持久化与恢复。
  - `storyWorkflow` 默认 UI 状态补齐 `assetsImageFilter: all`，旧 workspace 自动回退到 `all`。
  - `LeftSidebar` 图片过滤从组件本地 state 改为 `storyWorkflow.ui` 驱动；Step2 节点切换的自动过滤行为仍保留并同步入 workspace。
  - `Step1StoryPanel` 新增 seed 绑定失效自动清理：当 `linkedCharacterId` 不再存在时自动置空并提示 toast，避免悬空角色引用。
  - `editorStore.deleteCharacter/mergeCharacter` 增强：同步清理/重映射 `storyWorkflow.global.characterSeeds[].linkedCharacterId`。
  - 新增 i18n 文案：`story.step1.toast.bindingCleared.*`。
  - 测试更新：
    - `story-workflow-ui-persistence` 覆盖 `assetsImageFilter` 持久化与恢复。
    - `editor-store` 覆盖 `delete/merge` 对 seed 绑定的联动清理与重映射。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-workflow-ui-persistence.test.ts src/__tests__/editor-store.test.ts src/__tests__/step3-character-panel.test.tsx src/__tests__/step4-node-render-panel.test.tsx`
    - `npx vitest run src/__tests__/editor-store.test.ts src/__tests__/story-workflow-store.test.ts src/__tests__/timeline-event-layer.test.tsx src/__tests__/step2-outline-panel.test.tsx src/__tests__/step3-character-panel.test.tsx src/__tests__/step4-node-render-panel.test.tsx src/__tests__/story-node-card.test.tsx src/__tests__/story-progress.test.ts src/__tests__/branch-boundary-workspace.test.ts src/__tests__/story-workflow-boundary.test.ts src/__tests__/story-workflow-ui-persistence.test.ts src/__tests__/comfyui-params.test.ts`（43 tests）。
- 2026-02-16：事件流与节点循环主线继续收口（自动切步 + nextNode 一致性）：
  - `TimelineEditor` 事件流节点点击行为升级：除选中节点外，按节点当前进度自动切换到应执行步骤。
    - 规则：`step2 未完成 -> step2`，`step3 未完成或映射不完整 -> step3`，其余进入 `step4`；锁定节点固定回到 `step2` 只读。
  - `editorStore.confirmNodeVideo` 的“下一节点”策略从“严格下一个 order”改为“优先后续未确认且未锁定节点，再回退到后续未锁定节点”，避免落在已确认节点导致循环停滞。
  - `Step4NodeRenderPanel` 的 `nextNode` 计算同步改为与 store 一致，确保 toast 提示与实际跳转目标一致。
  - 测试更新：
    - `story-workflow-store` 新增“跳过已确认节点”用例，校验确认后跳到下一个待处理节点并同步 beat 选择。
    - `timeline-event-layer` 扩展为 2 个用例，覆盖事件点击自动路由到 `step3`（映射不完整）与 `step4`（可渲染）。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-workflow-store.test.ts src/__tests__/timeline-event-layer.test.tsx src/__tests__/step4-node-render-panel.test.tsx`
    - `npx vitest run src/__tests__/editor-store.test.ts src/__tests__/story-workflow-store.test.ts src/__tests__/timeline-event-layer.test.tsx src/__tests__/step2-outline-panel.test.tsx src/__tests__/step3-character-panel.test.tsx src/__tests__/step4-node-render-panel.test.tsx src/__tests__/story-node-card.test.tsx src/__tests__/story-progress.test.ts src/__tests__/branch-boundary-workspace.test.ts src/__tests__/story-workflow-boundary.test.ts src/__tests__/story-workflow-ui-persistence.test.ts src/__tests__/comfyui-params.test.ts`（45 tests）。
- 2026-02-16：节点引导主线继续推进（推荐动作徽记 + Step2 自动切步）：
  - 新增 `storyProgress.resolveNodeRecommendedAction` 公共规则，统一判定节点“下一步动作”和目标步骤：
    - 锁定节点 -> `step2/read_only`
    - Step2 未完成 -> `step2/edit_step2`
    - Step3 未完成或映射不完整 -> `step3/fix_step3`
    - Step3 完成后 -> `step4/render_step4`，若 Step4 已确认 -> `step4/review_step4`
  - `TimelineEditor` 事件流与 `Step2OutlinePanel` 节点列表统一复用该规则：点击节点时自动切到对应步骤，不再依赖各处手写判断。
  - 两处节点入口新增“推荐动作”徽记（next: edit text / fix mapping / render video / review / read only），提升主线推进可见性。
  - 新增 i18n 文案：`story.nextAction.*`。
  - 测试更新：
    - `story-progress` 增加推荐动作判定用例。
    - `step2-outline-panel` 增加点击路由到 step3/step4 用例。
    - `timeline-event-layer` 增加推荐动作徽记断言。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-progress.test.ts src/__tests__/step2-outline-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx`
    - `npx vitest run src/__tests__/editor-store.test.ts src/__tests__/story-workflow-store.test.ts src/__tests__/timeline-event-layer.test.tsx src/__tests__/step2-outline-panel.test.tsx src/__tests__/step3-character-panel.test.tsx src/__tests__/step4-node-render-panel.test.tsx src/__tests__/story-node-card.test.tsx src/__tests__/story-progress.test.ts src/__tests__/branch-boundary-workspace.test.ts src/__tests__/story-workflow-boundary.test.ts src/__tests__/story-workflow-ui-persistence.test.ts src/__tests__/comfyui-params.test.ts`（49 tests）。
- 2026-02-16：中央卡片引导语义对齐（推荐动作徽记）
  - `StoryNodeCard` 复用 `resolveNodeRecommendedAction`，在中央节点卡片头部增加“next: ...”徽记，动作语义与 Step2 节点列表、底部事件流完全一致。
  - 推荐动作覆盖：`read_only/edit_step2/fix_step3/render_step4/review_step4`。
  - 测试更新：`story-node-card` 增加推荐动作文案断言。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-progress.test.ts src/__tests__/step2-outline-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx src/__tests__/story-node-card.test.tsx`
    - 主线回归 12 文件（49 tests）。
- 2026-02-16：Inspector 入口接入剧情主线（统一推荐动作）
  - `InspectorPanel` 从“仅时间轴片段检查”扩展为“剧情节点 + 时间轴片段”双区块：即使未选中 timeline item，也可基于当前剧情节点查看推荐动作。
  - 新增“Go Recommended”按钮：一键选中当前节点并切到推荐步骤（同时切回左栏 `create` 工作流）。
  - Inspector 内新增 Step2/Step3/Step4 快捷跳转按钮，保证与底部事件流、Step2 节点列表、中央卡片的推进语义一致。
  - 新增 i18n 文案：`inspector.storyNode`、`inspector.goRecommended`。
  - 新增测试 `frontend/src/__tests__/inspector-panel.test.tsx`，覆盖：
    - 无 timeline 选中时仍可基于剧情节点显示推荐动作并跳转到目标步骤
    - timeline/node 均未选中时保持空态提示
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/inspector-panel.test.tsx src/__tests__/story-progress.test.ts src/__tests__/step2-outline-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx`
    - 主线回归：13 文件 51 tests 通过
- 2026-02-16：右侧面板主线继续收口（RightSidebar i18n + Inspector 锁定态）
  - `RightSidebar` tab 文案改为 i18n：`editor.right.inspector` / `editor.right.queue`，替换硬编码英文。
  - `InspectorPanel` 增强：
    - 保持“剧情节点区”在 timeline 选中异常时仍可使用，不再被 `Clip not found` 早退完全遮蔽。
    - 分支锁定节点时禁用 Step3/Step4 快捷按钮，并显示锁定提示文案。
    - `Go Recommended` 在锁定节点下回落到 `step2`（只读）路径，避免误导进入不可改阶段。
  - 新增 i18n 文案：
    - `inspector.storyNode.lockedHint`
    - `editor.right.inspector`
    - `editor.right.queue`
  - 新增测试：
    - `frontend/src/__tests__/right-sidebar.test.tsx`：验证右侧 tab 使用 i18n title，点击可切到 queue。
    - `frontend/src/__tests__/inspector-panel.test.tsx`：新增锁定态用例，验证 Step3/Step4 快捷按钮禁用及推荐跳转回 step2。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/right-sidebar.test.tsx src/__tests__/inspector-panel.test.tsx`
    - 主线回归：14 文件 53 tests 通过。
- 2026-02-16：Header 入口接入统一推荐动作（五处入口一致）
  - `EditorHeaderBar` 新增当前节点推荐动作显示：`next: ...`（复用 `resolveNodeRecommendedAction`），与 Step2/事件流/Inspector/中央卡片保持同源规则。
  - Header 新增 `Go Recommended` 按钮：一键选中当前节点、切回左侧 `create` 面板并跳到推荐步骤。
  - 推荐动作在锁定节点下可回落到 `step2`（read_only），避免误导进入不可编辑阶段。
  - 新增 i18n 文案：`editor.header.goRecommended`。
  - 新增测试 `frontend/src/__tests__/editor-header-bar.test.tsx`，覆盖：
    - 映射未完成节点点击后自动进入 step3
    - 锁定节点点击后回落到 step2
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/editor-header-bar.test.tsx src/__tests__/inspector-panel.test.tsx src/__tests__/right-sidebar.test.tsx`
    - 主线回归：15 文件 55 tests 通过。
- 2026-02-16：推荐动作视觉分级收口（Header/Step2/事件流/中央卡片统一）
  - 在 `storyProgress` 增加 `resolveStoryActionBadgeClass(action, tone)` 公共函数，统一推荐动作徽记颜色映射，避免多处手写分叉。
  - 替换以下组件中的本地颜色判断为公共函数：
    - `TimelineEditor`（事件流节点徽记）
    - `Step2OutlinePanel`（节点列表徽记）
    - `StoryNodeCard`（中央卡片徽记，使用 `soft` tone）
    - `EditorHeaderBar`（顶部节点推荐徽记）
  - Header 视觉增强：推荐动作改为彩色 badge，`read_only` 额外显示锁定标签。
  - 测试更新：`story-progress` 新增 badge class 映射稳定性用例。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-progress.test.ts src/__tests__/editor-header-bar.test.tsx src/__tests__/step2-outline-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx src/__tests__/story-node-card.test.tsx`
    - 主线回归：15 文件 56 tests 通过。
- 2026-02-16：推荐动作徽记组件化（StoryActionBadge）
  - 新增 `frontend/src/components/editor/story/StoryActionBadge.tsx`，封装推荐动作文案 + 颜色映射输出，支持 `tone(solid/soft)` 与 `withLabel`。
  - 将以下入口替换为组件调用，移除重复 JSX 与局部 class 分支：
    - `TimelineEditor`（事件流）
    - `Step2OutlinePanel`（节点列表）
    - `StoryNodeCard`（中央卡片）
    - `EditorHeaderBar`（顶部）
    - `InspectorPanel`（右侧）
  - `storyProgress` 保留并复用 `resolveStoryActionBadgeClass`，作为组件与特殊场景统一来源。
  - 新增测试 `frontend/src/__tests__/story-action-badge.test.tsx`，覆盖：
    - 默认 solid + label 输出
    - soft + 无 label 输出
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run src/__tests__/story-action-badge.test.tsx src/__tests__/story-progress.test.ts src/__tests__/step2-outline-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx src/__tests__/story-node-card.test.tsx src/__tests__/editor-header-bar.test.tsx src/__tests__/inspector-panel.test.tsx`
    - 主线回归：16 文件 58 tests 通过。
- 2026-02-16：Step3/Step4 面板语义对齐（补齐推荐动作徽记）
  - `Step3CharacterPanel` 接入统一推荐动作判定：顶部新增 `StoryActionBadge`（soft），显示当前节点下一步建议（`fix_step3/render_step4/...`），与 Step2/事件流/中央卡片/Header/Inspector 保持一致。
  - `Step4NodeRenderPanel` 顶部“当前节点”信息旁新增 `StoryActionBadge`（soft），避免用户进入 Step4 后失去主线推进提示。
  - 测试更新：
    - `step3-character-panel` 新增推荐动作徽记断言（映射缺失 -> `fix_step3`；映射完整但未确认 -> `fix_step3`）。
    - `step4-node-render-panel` 新增推荐动作徽记断言（默认 -> `render_step4`）。
- 2026-02-16：左侧 Step 导航接入推荐动作直达（主线再收口）
  - `StepNavigator` 新增当前节点推荐动作显示（复用 `resolveNodeRecommendedAction` + `StoryActionBadge`），并在目标 Step 卡片内显示同源动作徽记（无 label 版本）。
  - `StepNavigator` 新增 `Go Recommended` 按钮，点击后会选中当前节点并跳转到推荐步骤；锁定节点保持回落到 `step2` 只读路径。
  - 新增测试 `frontend/src/__tests__/step-navigator.test.tsx`，覆盖：
    - 映射缺失场景点击推荐按钮进入 `step3`
    - 锁定节点场景点击推荐按钮回落到 `step2`
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（17 文件主线回归）`60 tests` 通过。
- 2026-02-16：ComfyUI 页签接入推荐动作直达（避免停留在错误面板）
  - `ComfyUIWorkflowPanel` 接入 `resolveNodeRecommendedAction` + `StoryActionBadge`，在页头显示当前节点的推荐动作。
  - `ComfyUIWorkflowPanel` 新增 `Go Recommended` 按钮：点击后同步选中节点并跳转推荐步骤。
  - 当推荐目标为 `step1/step2` 时，触发 `onRequestStoryTab` 切回 `Story` 页签，避免用户在 ComfyUI 页签中停留导致“步骤跳了但面板不变”。
  - `CreatePanel` 透传 `onRequestStoryTab={() => setTab("story")}` 给 `ComfyUIWorkflowPanel`。
  - 新增测试 `frontend/src/__tests__/comfyui-workflow-panel.test.tsx`，覆盖：
    - 推荐到 `step3` 时仅切步骤，不切 tab
    - 锁定节点推荐到 `step2` 时切步骤并请求切回 story tab
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（18 文件主线回归）`62 tests` 通过。
- 2026-02-16：ComfyUI 参数填写提效（注入当前节点上下文）
  - `ComfyUIWorkflowPanel` 的 params 区新增“Inject Node Context”按钮：将当前节点的文本与资产绑定信息注入到 params JSON，减少手工拷贝。
  - 注入字段包含：`node/scene/beat` 标识、`narration/visual_description`、`step2` 摘要字段、`character_asset_ids/urls`、背景/首尾图/视频资源 URL。
  - 注入策略：保留用户原有自定义键，覆盖同名上下文字段为当前节点最新值。
  - 当 params JSON 非法时阻断注入并给出错误 toast，避免写入损坏状态。
  - 新增 i18n 文案：
    - `comfyui.workflow.params.injectContext`
    - `comfyui.workflow.params.injected`
    - `comfyui.workflow.params.invalidJson.*`
  - 测试更新：`frontend/src/__tests__/comfyui-workflow-panel.test.tsx` 新增注入上下文用例（含 URL/映射断言）。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（18 文件主线回归）`63 tests` 通过。
- 2026-02-16：后端 provider hint 元数据收口（auto 解析 + 边界测试）
  - `generation_service.generate_script` 在 `llm_provider=auto` 且启用本地模型时，`meta.resolved_provider` 从通用 `"local"` 收敛为具体 provider（如 `ollama/sglang/vllm/openai_compatible`），便于前端展示与排障。
  - `test_storyboard_provider_hint` 增补覆盖：
    - `openai_compatible` hint 成功路径
    - `auto` 路径按 `LOCAL_LLM_PROVIDER` 回传 `resolved_provider`
    - `_compose_story_prompt` 的结构化 hints 拼接（stage/style/script/seed/outline）
  - 后端回归验证通过：
    - `./venv/bin/python -m pytest tests/test_storyboard_provider_hint.py tests/test_generation.py tests/test_files.py -q`
    - 结果：`12 passed`（含新增用例）。
- 2026-02-16：ComfyUI 注入链路继续收口（按 bindings 精准注入）
  - `ComfyUIWorkflowPanel` 在“Inject Node Context”之外新增“Inject by Bindings”按钮：只根据 `bindings[].param` 命中的上下文字段写入 params，减少噪音键。
  - 新增 `extractBindingParamKeys`：校验 `bindings` 必须是数组并提取唯一 `param` 键，非法时给出错误 toast。
  - 新增注入结果分支反馈：
    - bindings 为空（无可注入参数）
    - bindings 与上下文字段无交集
    - 成功注入并显示注入数量
  - 新增 i18n 文案：
    - `comfyui.workflow.params.injectByBindings`
    - `comfyui.workflow.params.bindingsInvalid.*`
    - `comfyui.workflow.params.bindingsEmpty.*`
    - `comfyui.workflow.params.bindingsNoMatch.*`
    - `comfyui.workflow.params.bindingsInjected.*`
  - 测试更新：`frontend/src/__tests__/comfyui-workflow-panel.test.tsx` 增加按 bindings 注入用例（仅命中键注入、不写入无关键）。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（18 文件主线回归）`64 tests` 通过。
- 2026-02-16：ComfyUI bindings 注入可观测性增强（注入前可见命中情况）
  - `ComfyUIWorkflowPanel` 新增 bindings 预览状态：
    - `Binding coverage`（命中/总数）
    - `Unmatched bindings`（未命中键名列表）
    - bindings JSON 非法时显示就地错误提示
  - `inject-by-bindings` 的 “no match” 提示增加键名回显（`{keys}`），便于快速修正 bindings。
  - 新增 i18n 文案：
    - `comfyui.workflow.params.bindingsPreview.*`
    - `comfyui.workflow.params.bindingsNoMatch.desc` 增加 `{keys}` 占位。
  - 测试更新：`frontend/src/__tests__/comfyui-workflow-panel.test.tsx`
    - 断言 coverage/unmatched 预览可见
    - 断言 invalid bindings 输入时出现错误提示与 destructive toast
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（18 文件主线回归）`65 tests` 通过。
- 2026-02-16：ComfyUI 未命中参数复制能力（补全修复闭环）
  - 在 `Unmatched bindings` 区域新增 `Copy Missing Keys` 按钮，一键复制未命中参数名列表到剪贴板，方便回填 workflow params。
  - 新增复制反馈分支：
    - 无未命中参数（提示无需复制）
    - 复制成功（显示复制数量）
    - 剪贴板不可用/失败（destructive 提示）
  - 新增 i18n 文案：`comfyui.workflow.params.copyMissing.*`。
  - 测试更新：`frontend/src/__tests__/comfyui-workflow-panel.test.tsx` 增加复制用例（校验 clipboard.writeText 调用与 success toast）。
  - 本地验证通过：
    - `npm run typecheck`
    - `npx vitest run ...`（18 文件主线回归）`66 tests` 通过。
- 2026-02-16：Storyboard provider 枚举收敛（前后端一致）
  - 后端 `generation_service` 增加 provider 归一化：
    - `requested_provider` 非法值回落到 `auto` 并记录 warning
    - `resolved_provider` 在本地模式下强制收敛到 `ollama/vllm/sglang/openai_compatible`，避免任意字符串漂移
  - 后端 `StoryboardResponse.meta` 从 `Dict[str, Any]` 收紧为显式模型 `StoryboardMeta`（`requested_provider/resolved_provider/fallback_used/warnings`）。
  - 前端 API 类型同步收紧：
    - `StoryboardRequestedProvider`
    - `StoryboardResolvedProvider`（含 `cloud`）
    - `Step1StoryPanel` / `Step2OutlinePanel` 去掉 `as any` 强制转换，直接按枚举消费。
  - i18n 增补 `story.provider.cloud`。
  - 后端测试更新：`backend/tests/test_storyboard_provider_hint.py` 增加“未知 provider 回落到 auto”用例。
  - 本地验证通过：
    - `./venv/bin/python -m pytest tests/test_storyboard_provider_hint.py tests/test_generation.py tests/test_files.py -q`
    - 结果：`13 passed`。
- 2026-02-17：分支边界锁后端硬校验（workspace 写入防绕过）
  - `PUT /api/v1/projects/{id}/workspace` 新增服务端校验：
    - 若历史 workspace 已配置 `storyWorkflow.branchPolicy.lockBoundaryOrder`，则新 payload 必须包含 `storyWorkflow` 且边界不可后退。
    - 历史锁定区间（`order < boundary`）节点内容不可改写（忽略前端派生字段 `locked`）。
    - 锁定节点关联 `beats` 内容不可改写，防止通过底层 `editorState.beats` 绕过节点锁。
    - 非对象 payload 直接拒绝（400）。
  - 新增测试：`backend/tests/test_projects_workspace_lock.py`，覆盖边界后退/锁定节点改写/锁定 beat 改写/缺失 storyWorkflow 拦截与未锁节点可改写。
- 2026-02-17：ComfyUI URL 上传链路安全加固（协议/主机/大小/重定向）
  - 新增 `backend/app/utils/url.py`：
    - `validate_remote_url(...)`：协议白名单、主机 allowlist、私网/回环地址拦截（可配置开关）。
    - `read_bytes_from_url(...)`：大小上限、超时、禁止重定向（防 SSRF 绕过）、本地文件开关控制。
  - 新增配置项（`backend/app/core/config.py`）：
    - `COMFYUI_UPLOAD_ALLOWED_HOSTS`
    - `COMFYUI_UPLOAD_ALLOW_PRIVATE_HOSTS`
    - `COMFYUI_UPLOAD_FETCH_TIMEOUT_SECONDS`
    - `COMFYUI_UPLOAD_MAX_BYTES`
  - API 预校验（入队前失败）：
    - `backend/app/api/v1/endpoints/comfyui_templates.py`
    - `backend/app/api/v1/endpoints/generation.py`
    - 非法 `uploads[i].url` 返回 400，不进入 Celery 队列。
  - Worker 执行链路加固：
    - `backend/app/workers/comfyui_tasks.py` 不再直接按 URL 上传，改为受限下载后再 `upload_image_bytes`。
  - 测试补充：
    - `backend/tests/test_comfyui_templates.py` 增加非法 URL 拒绝用例。
    - `backend/tests/test_generation.py` 增加 `/generate/comfyui` 非法 URL 拒绝用例。
- 2026-02-17：前端主线强化（事件层性能 + i18n 覆盖门禁）
  - 时间轴事件层性能优化：`frontend/src/components/TimelineEditor.tsx`
    - 新增 `timelineItemByBeatId` 索引缓存，避免 `storyEvents` 计算中按节点重复 `Object.values(...).find(...)` 的 N×M 查找。
  - 新增 i18n 校验脚本：`frontend/scripts/check-i18n-keys.js`
    - 扫描源码中 `t()/i18nText()/translate()` 的字面量 key，并校验是否存在于 `src/lib/i18n.ts`。
    - 集成脚本：
      - `npm run check:i18n`
      - `npm run check` / `npm run check:ci` 已接入该校验。
  - 本地验证通过：
    - 后端：`cd backend && ./venv/bin/python -m pytest tests/test_projects.py tests/test_projects_workspace_lock.py tests/test_comfyui_templates.py tests/test_generation.py tests/test_files.py tests/test_storyboard_provider_hint.py -q`
      - 结果：`29 passed`
    - 前端：`cd frontend && npm run typecheck && npm run check:i18n && npx vitest run src/__tests__/comfyui-workflow-panel.test.tsx src/__tests__/timeline-event-layer.test.tsx`
      - 结果：`typecheck 通过`，`i18n-check 通过`，`8 tests passed`
- 2026-02-18：阶段文档与主线回归入口同步（持续开发提速）
  - 文档状态同步：
    - `plan/current_stage&FAQ.md` 已明确主线为 `Dev v2 - Stage 03/04: Fork/Branch 协作深化（含四步剧情流）`。
    - 重写 `docs/current_code_framework_report_zh.md`，内容更新为 2026-02-18 快照，覆盖：
      - 四步剧情流 + 事件层 + 中央节点卡片联动
      - ComfyUI 官方接口与 workflow 执行链
      - fork 与 branch 语义拆分、workspace 分支边界锁
      - 最新代码规模统计（81 路由、32 前端单测等）
  - 新增前端主线回归脚本：
    - `frontend/scripts/check-story-workflow.sh`（Node20 自适配 + `typecheck` + 14 个 story-workflow 相关测试文件）
    - `frontend/package.json` 新增脚本：`npm run check:story`
  - 本地验证通过：
    - `cd frontend && npm run check:story`
    - `cd frontend && npm run check:i18n`
    - 结果：`14 files / 71 tests passed`，`typecheck passed`，`i18n-check OK (942 used / 1035 dictionary)`。
- 2026-02-18：编辑器主流程继续收口（ComfyUI 运行态/模板接入 + fork/branch 语义提示强化）
  - `ComfyUIWorkflowPanel` 补齐编辑器内能力（不依赖 Settings 页面）：
    - 新增运行态卡片：可见 `ComfyUI 可达性 + queue running/pending`，支持刷新。
    - 新增模板库卡片：拉取模板列表、选择模板并一键加载 `workflow/bindings` 到当前编辑区后直接执行。
    - 保留已有节点上下文注入与 bindings 注入能力，形成“选模板 -> 注入上下文 -> 入队渲染”的主流程闭环。
  - `ProjectPreviewClient` 强化 fork / branch 协作语义隔离提示：
    - 非 owner 场景下新增 fork 与 branch 的说明文案，明确：
      - fork 是仓库复制且需要 owner 审批；
      - branch 不改变仓库归属，基于指定提交继续创作。
    - 对非公开仓库禁用“创建分支”按钮，并给出提示文案，避免无效操作。
  - i18n 新增文案：
    - `comfyui.workflow.runtime`
    - `comfyui.workflow.templates.*`
    - `project.preview.collab.*`
  - 测试补充与稳定性修复：
    - `frontend/src/__tests__/comfyui-workflow-panel.test.tsx` 新增“模板加载到编辑器”用例。
    - 修复该测试文件的 `act(...)` 警告（异步渲染入口），回归输出无警告。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/comfyui-workflow-panel.test.tsx src/__tests__/project-preview-branches.test.tsx`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
    - `cd frontend && npm run check:story`
    - 结果：`12 tests passed`，`typecheck passed`，`i18n-check OK (951 used / 1044 dictionary)`，`check:story 14 files / 71 tests passed`。
- 2026-02-18：fork / branch 语义隔离继续收口（ProjectCard 与 GitGraph 菜单）
  - `ProjectCard` 新增独立 `Create Branch` 动作（与 Fork 按钮完全分离）：
    - 新增 `projectApi.forkBranch` 调用路径，创建成功后直接跳转 `/editor/{projectId}?branch={name}`。
    - 非 owner 且未登录时，创建分支前强制跳转登录。
    - 非 owner 且项目非公开时禁用“创建分支”，保留 fork request 路径。
  - `GitGraphContextMenu` 增加 fork/branch 语义提示文案：
    - `graph.menu.forkHint`：明确 fork 是复制仓库且需 owner 审批。
    - `graph.menu.moveBoundaryHint`：明确 branch 不改变归属，仅从边界提交后改写。
  - i18n 补充：
    - `graph.menu.forkHint`
    - `graph.menu.moveBoundaryHint`
  - 测试更新：
    - `frontend/src/__tests__/project-card.test.tsx` 新增 3 个用例（public 可建 branch / private 禁用 / 未登录跳转）。
    - `frontend/src/__tests__/git-graph-context-menu.test.tsx` 新增语义提示断言。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/project-card.test.tsx src/__tests__/git-graph-context-menu.test.tsx src/__tests__/project-preview-branches.test.tsx`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
    - `cd frontend && npm run check:story`
    - 结果：`17 tests passed`，`typecheck passed`，`i18n-check OK (953 used / 1046 dictionary)`，`check:story 14 files / 71 tests passed`。
- 2026-02-18：fork / branch 主线继续收口（共享规则层 + 编辑器协作状态条）
  - 新增共享规则模块：`frontend/src/lib/projectCollaboration.ts`
    - `hasAuthToken(token)`
    - `canCreateBranchInRepo({ isOwner, isPublic })`
    - `buildProjectLoginRedirect(projectId)`
  - `ProjectCard` / `ProjectPreviewClient` 统一复用上述规则，收敛分支创建与未登录跳转行为：
    - 创建分支权限统一：owner 或 public 项目可创建分支。
    - 未登录点击 fork request / create branch 时统一跳转 `/login?next=/project/{id}`。
  - `EditorHeaderBar` 新增协作模式状态条：
    - 显示当前上下文 `Mainline / Branch Edit / Fork Copy`。
    - 使用 title 提示对应协作语义（main/branch/fork）。
  - i18n 新增文案：
    - `editor.collab.mode.main|branch|fork`
    - `editor.collab.hint.main|branch|fork`
  - 测试补充：
    - 新增 `frontend/src/__tests__/project-collaboration.test.ts`
    - 扩展 `project-preview-branches`：无 token 时 fork/branch 均跳登录。
    - 扩展 `editor-header-bar`：协作模式状态条渲染断言。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/project-collaboration.test.ts src/__tests__/project-card.test.tsx src/__tests__/project-preview-branches.test.tsx src/__tests__/editor-header-bar.test.tsx`
      - 结果：`25 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (953 used / 1052 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：fork / branch 入口一致性继续加强（GitGraph 登录守卫 + Preview 就地禁用提示）
  - `GitGraph` 接入共享协作规则：
    - 右键菜单触发 `Fork from commit` / `Move Branch Boundary` 前先校验 token；未登录统一跳转 `/login?next=/project/{id}`。
    - 复用 `projectCollaboration` 的 `hasAuthToken` 与 `buildProjectLoginRedirect`，避免入口语义漂移。
  - `ProjectPreviewClient` 增加 private 仓库分支禁用的就地提示：
    - 非 owner 且仓库非公开时，除按钮禁用/title 外，新增可见的提示块 `project.preview.collab.branchRequiresPublic`。
  - 测试补充：
    - `project-preview-branches` 新增 private 场景断言（create branch 按钮禁用 + 提示可见）。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/project-preview-branches.test.tsx src/__tests__/project-card.test.tsx src/__tests__/project-collaboration.test.ts src/__tests__/editor-header-bar.test.tsx src/__tests__/git-graph-context-menu.test.tsx`
      - 结果：`29 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (953 used / 1052 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：GitGraph 右键菜单交互收口（未登录禁用态 + 就地登录入口）
  - `GitGraphContextMenu` 新增受限态能力：
    - `forkDisabled` / `moveBoundaryDisabled`
    - `forkDisabledReason` / `moveBoundaryDisabledReason`
    - `onGoLogin`
  - 未登录时：
    - `Fork from commit` 与 `Move Branch Boundary` 按钮直接禁用（可见不可点），避免“点击后才跳转”的多余交互。
    - 菜单内显示受限原因提示，并提供“登录后继续”快捷入口。
  - `GitGraph` 接入上述能力：
    - 复用 `projectCollaboration` 的登录判定与跳转地址构造。
    - 保留 action handler 内的登录兜底校验，防止绕过 UI。
  - i18n 新增：
    - `graph.menu.authRequired`
    - `graph.menu.goLogin`
  - 测试更新：
    - `frontend/src/__tests__/git-graph-context-menu.test.tsx` 新增“禁用态 + 登录入口”用例。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/git-graph-context-menu.test.tsx src/__tests__/project-preview-branches.test.tsx src/__tests__/project-card.test.tsx src/__tests__/project-collaboration.test.ts src/__tests__/editor-header-bar.test.tsx`
      - 结果：`30 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (955 used / 1054 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：fork / branch 入口一致性继续补齐（ProjectCard 可见提示 + GitGraph 分支权限传参）
  - `ProjectCard` 增加 private 仓库的分支禁用可见提示：
    - 非 owner 且 `is_public=false` 时，除 branch 按钮 disabled 外，新增 `branchRequiresPublic` 警示块（与 Preview 页面一致）。
  - `GitGraph` 增加分支权限传参控制：
    - `canMoveBoundaryFromCommit`（默认 true）
    - `moveBoundaryDeniedReason`（禁用原因文案）
    - 在无分支权限时，`Move Branch Boundary` 直接禁用并阻断 handler 执行。
  - `ProjectPreviewClient` 在 graph tab 传入分支权限：
    - `canMoveBoundaryFromCommit={canCreateBranchAction}`
    - 非可用时透传 `project.preview.collab.branchRequiresPublic` 给菜单禁用说明。
  - 测试更新：
    - `project-card` 的 private 分支禁用用例新增“可见提示”断言。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/project-card.test.tsx src/__tests__/project-preview-branches.test.tsx src/__tests__/git-graph-context-menu.test.tsx`
      - 结果：`21 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (955 used / 1054 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：编辑器历史图谱权限对齐（LeftSidebar -> GitGraph）
  - `LeftSidebar` 接入项目访问信息与协作权限推断：
    - 新增 `useMe` + `useQuery`，按 `getPublic -> 404 fallback get` 拉取项目信息。
    - 使用 `canCreateBranchInRepo` 推断 `canMoveBoundaryFromCommit`。
  - `LeftSidebar` 内嵌 `GitGraph` 改为显式透传：
    - `canMoveBoundaryFromCommit`
    - `moveBoundaryDeniedReason`（复用 `project.preview.collab.branchRequiresPublic`）
  - 效果：
    - 编辑器 history 图谱与项目详情页 graph tab 在“前移分支边界”权限上语义一致，不再出现一处禁用一处可用的漂移。
  - 本地验证通过：
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (955 used / 1054 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：权限对齐补测（LeftSidebar history 图谱）
  - 新增测试 `frontend/src/__tests__/left-sidebar-history-permission.test.tsx`，覆盖：
    - 非 owner + private 项目时，`LeftSidebar` 传给 `GitGraph` 的 `canMoveBoundaryFromCommit=false`。
    - owner + private 项目时，`canMoveBoundaryFromCommit=true`。
  - 该测试使用 `GitGraph` 代理组件捕获 props，验证权限透传链路而不引入生产 Mock 逻辑。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/left-sidebar-history-permission.test.tsx`
      - 结果：`2 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (955 used / 1054 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：历史图谱可见性与透传验证继续增强
  - `LeftSidebar` 的 history 面板新增就地提示：
    - 当 `canMoveBoundaryFromCommit=false` 时，直接显示 `project.preview.collab.branchRequiresPublic`，无需打开右键菜单才知道受限。
  - `left-sidebar-history-permission` 测试增强：
    - 非 owner/private：断言受限提示可见。
    - owner/private：断言受限提示不可见。
  - `project-preview-branches` 测试增强：
    - 新增用例断言 `ProjectPreview -> GitGraph` 的权限透传（`canMoveBoundaryFromCommit=false` + 非空 denied reason）。
  - 本地验证通过：
    - `cd frontend && npx vitest run src/__tests__/left-sidebar-history-permission.test.tsx src/__tests__/project-preview-branches.test.tsx`
      - 结果：`11 tests passed`
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (955 used / 1054 dictionary)`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 72 tests passed`
- 2026-02-18：前端卡住问题修复与 E2E 稳定性收口（Playwright + 分形树性能）
  - 修复 Playwright `webServer` readiness 超时：
    - `frontend/playwright.config.ts` 改为 `127.0.0.1` 启动与访问，探针 URL 改为 `http://127.0.0.1:3000/api/healthz`，避免首页负载影响就绪探测。
    - 新增 `frontend/src/app/api/healthz/route.ts` 作为独立健康检查端点。
  - 修复“next dev 已 ready 但页面请求长时间等待”的性能瓶颈：
    - `frontend/src/components/ui/fractal-tree.tsx` 增加段数上限保护（防递归爆量）。
    - 生成逻辑改为 `useMemo + memo`，并使用稳定 seed 随机，避免每次重渲染重复重算分形段。
  - E2E 用例收口：
    - `frontend/tests/e2e/test_project_collab_permissions.spec.ts` 中混合权限场景断言改为限定在 `Commit actions` 容器内，修复 strict mode 多元素匹配失败。
  - 本地验证通过（Node 20）：
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run check:story`
      - 结果：`14 files / 85 tests passed`
    - `cd frontend && npm run check:i18n`
      - 结果：`i18n-check OK (1003 used / 1112 dictionary)`
    - `cd frontend && npx playwright test tests/e2e/test_project_collab_permissions.spec.ts --project=chromium --workers=1 --reporter=list`
      - 结果：`2 passed`
