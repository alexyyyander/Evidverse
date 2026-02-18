# Evidverse 当前代码框架梳理报告

更新时间：2026-02-18（含本轮稳定性补充）  
代码基线：仓库当前工作区（`frontend` + `backend` + `ai_engine` + `cli`）

## 1. 报告目的与当前阶段
本报告用于给出“当前代码已落地内容”的结构化快照，重点覆盖你正在推进的主线：编辑器四步剧情流、ComfyUI 工作流接入、分支协作规则。

当前阶段信息（来源：`plan/current_stage&FAQ.md`）：
- `Dev v2 - Stage 03/04: Fork/Branch 协作深化（含四步剧情流）`
- 状态：`in_progress`

## 2. 系统总体架构
系统采用前后端分离 + 异步任务 + 对象存储 + AI 适配层的架构，核心路径如下：

```text
[Next.js Frontend]
      |
      | HTTP /api/v1/*
      v
[FastAPI Backend]
      |
      +--> [PostgreSQL]  (项目/分支/提交/workspace/任务元数据)
      +--> [RabbitMQ]    (Celery Broker)
      +--> [Redis]       (缓存/结果)
      +--> [MinIO/S3]    (图片/视频/导出资产)
      |
      v
[Celery Workers]
      |
      v
[ai_engine]
  + local: ollama / vllm / sglang / comfyui / ltx
  + cloud: openai-compatible / stability / seedance
```

## 3. 代码规模快照（当前统计）
统计口径：按源码目录实时扫描（`.py` / `.tsx` / test 文件），不含 `node_modules`。

- 后端 API 路由定义：`81`
- 后端模型类（SQLAlchemy Base）：`15`
- 后端服务文件：`10`
- Celery worker 文件：`7`
- 后端测试函数：`60`
- 前端页面文件（`page.tsx`）：`11`
- 前端布局文件（`layout.tsx`）：`5`
- 前端组件文件（`.tsx`）：`56`
- 前端 store 文件：`3`
- 前端 query hooks：`8`
- 前端 API 域模块：`13`
- 前端单测文件：`32`
- 前端 E2E 文件：`3`
- `ai_engine` Python 文件：`21`
- CLI Python 文件：`7`
- Alembic 迁移文件：`19`

## 4. Backend 架构（FastAPI + Service + Worker）

### 4.1 分层结构
- 路由汇总：`backend/app/api/v1/router.py`
- 服务层：`backend/app/services/`
- 模型层：`backend/app/models/`
- 异步任务：`backend/app/workers/`

整体仍是标准分层：`endpoint -> service -> model`，任务型能力通过 Celery 异步化。

### 4.2 API 领域现状
主要领域（按路由模块）：
- `auth/users`：认证与用户信息
- `projects/branches/commits`：项目协作主线
- `generation`：storyboard、character、segment、ComfyUI 触发
- `comfyui`：模板管理 + 官方接口代理 + 工作流执行
- `files`：预签名上传（已返回 `storage_url`）
- `publish`：投稿任务
- `vn`：VN 资产与解析
- `merge_requests`：分支协作流程

### 4.3 当前后端主线增强点
1. Storyboard 扩展字段与 provider hint  
   `POST /api/v1/generate/storyboard` 已支持 `stage/llm_provider/story_mode/story_style/tone/script_mode/segment_length/character_seed/existing_outline`，并返回 `meta`（请求 provider、实际 provider、fallback、warnings）。

2. ComfyUI 官方接口补齐  
   `backend/app/api/v1/endpoints/comfyui_templates.py` 已支持：
   - `GET /api/v1/comfyui/health`
   - `GET /api/v1/comfyui/object-info`
   - `GET /api/v1/comfyui/object-info/{node_class}`
   - `GET /api/v1/comfyui/system-stats`
   - `GET /api/v1/comfyui/queue`
   - `POST /api/v1/comfyui/upload-image`
   - `POST /api/v1/comfyui/workflows/execute`
   - 模板 CRUD + render

3. workspace 分支边界锁（轻后端）  
   `PUT /api/v1/projects/{id}/workspace` 在 `projects.py` 中对已配置边界执行不可变校验：锁定节点与锁定 beat 的历史内容不可被改写，边界不可后退。

4. fork 与 branch 语义拆分  
   - fork：仓库级复制，非 owner 走 fork request，owner 审批
   - branch：项目归属不变，允许在分支上继续创作
   - `GET /projects` 与 `GET /projects/branch-participations` 已分离“我拥有”与“我参与的分支项目”

### 4.4 服务层关键点
- `backend/app/services/generation_service.py`
  - 统一 AI 入口
  - provider hint best-effort + fallback 到 cloud
  - 输出 storyboard + meta
- `backend/app/services/story_service.py`
  - 对 storyboard 生成调用保持兼容封装
- `backend/app/services/comfyui_service.py`
  - ComfyUI 官方接口客户端封装
- `backend/app/services/project_service.py`
  - 项目创建、fork、分支参与查询

### 4.5 Worker 关键点
- `backend/app/workers/workflow_tasks.py`：segment/clip 流程
- `backend/app/workers/comfyui_tasks.py`：ComfyUI workflow 执行与输出上传
- `backend/app/workers/image_tasks.py` / `video_tasks.py`：图像/视频任务
- `backend/app/workers/publish_tasks.py`：投稿执行链路

## 5. Frontend 架构（Next.js + Zustand + React Query）

### 5.1 总体结构
- App Router：`frontend/src/app/`
- 组件层：`frontend/src/components/`
- 状态层：`frontend/src/store/`
- API SDK：`frontend/src/lib/api/`
- 编辑器核心：`frontend/src/components/editor/` + `frontend/src/lib/editor/`

### 5.2 状态模型现状
`frontend/src/store/editorStore.ts` 已承载四步剧情流主状态：
- `storyWorkflow`（可迁移、可持久化）
- `activeStep` / `selectedNodeId`
- 节点 step2/step3/step4 状态与资产映射
- 分支边界锁检查（store 写入侧保护）
- `focusTarget`（用于 timeline/step 面板联动跳转）

类型定义位于：
- `frontend/src/lib/editor/types.ts`
- `frontend/src/lib/editor/storyWorkflow.ts`
- `frontend/src/lib/editor/storyProgress.ts`

### 5.3 编辑器四步工作流（已进入主线）
主要组件：
- `frontend/src/components/editor/story/StepNavigator.tsx`
- `frontend/src/components/editor/story/Step1StoryPanel.tsx`
- `frontend/src/components/editor/story/Step2OutlinePanel.tsx`
- `frontend/src/components/editor/story/Step3CharacterPanel.tsx`
- `frontend/src/components/editor/story/Step4NodeRenderPanel.tsx`

关键行为：
1. Step1：story 模式/风格/语气/LLM provider + 结构化人物 seed + 参考图入资产池  
2. Step2：长故事分片与节点内容编辑（剧情/背景/人物变化/遭遇）  
3. Step3：角色图生成或上传，1:1 映射校验，缺失时阻断推进  
4. Step4：节点资产绑定、渲染视频、确认后自动推进下一节点

### 5.4 时间轴叠加剧情事件层
核心文件：`frontend/src/components/TimelineEditor.tsx`

在保留原时间轴编辑能力的基础上，叠加剧情节点事件层，支持：
- 节点 step2/step3/step4 状态徽记
- Step3 映射进度
- Step4 渲染来源（segment/comfyui）、模板与参数状态
- 锁定状态与推荐动作
- 点击事件节点联动中央卡片与当前 step

### 5.5 中央卡片与阻断联动
- `frontend/src/components/editor/story/StoryNodeCard.tsx`
- `frontend/src/components/editor/story/Step4NodeRenderPanel.tsx`

当前实现要点：
- 中央视图围绕当前节点显示文本/资产/视频状态
- Step4 阻断原因（mapping/image/video）可回溯并可跳转定位
- `focusTarget` 与 Step3/Step4 面板消费联动已落地（稳定用例保留）

### 5.6 Fork / Branch 前端语义
关键文件：
- `frontend/src/components/GitGraph.tsx`
- `frontend/src/components/GitGraphContextMenu.tsx`
- `frontend/src/components/ParticipatedBranchControl.tsx`
- `frontend/src/components/editor/EditorHeaderBar.tsx`

当前语义：
- fork 与 checkout/branch 已在交互入口拆分
- 参与他人项目分支的内容可在“参与分支项目”链路查看和进入

## 6. AI Engine 架构

核心目录：
- `ai_engine/adapters/`：统一接口与 local/cloud 选择
- `ai_engine/local/`：本地 LLM / ComfyUI / 视频客户端
- `ai_engine/models/`：模型配置与注册

现状：
- 支持本地模型优先 + 可配置 fallback cloud
- LLM 支持 `ollama/vllm/sglang/openai_compatible` 语义
- 图像/视频链路可由 ComfyUI workflow 驱动

## 7. CLI 架构
目录：`cli/evidverse/`

主要能力：
- `login/logout`
- `init/status`
- `generate`
- `commit`
- `branch/checkout`

CLI 仍保持 REST 客户端定位，不承载复杂工作流编排逻辑。

## 8. 部署与测试

### 8.1 部署
- 开发：`docker-compose.yml`（基础依赖）
- 生产：`docker-compose.prod.yml`（frontend/backend/worker/nginx/infra）

### 8.2 测试结构
- 后端：`backend/tests/`（provider hint、fork request、workspace lock、comfyui 等）
- 前端：`frontend/src/__tests__/`（story workflow、timeline event layer、step 面板联动）
- E2E：`frontend/tests/e2e/`
  - 权限语义 E2E：`test_project_collab_permissions.spec.ts`

### 8.3 本轮稳定性回归（2026-02-18）
1. 修复 E2E 卡住（webServer readiness 超时）
   - `frontend/playwright.config.ts` 将探针从首页改为 `http://127.0.0.1:3000/api/healthz`，并统一使用 `127.0.0.1`。
   - 新增健康探针路由：`frontend/src/app/api/healthz/route.ts`。
2. 修复前端“可启动但请求长时间无响应”的性能瓶颈
   - `frontend/src/components/ui/fractal-tree.tsx` 增加递归段数上限、`useMemo` 缓存与 `memo`，并改为稳定种子随机，避免重渲染时分形树重复高负载计算。
3. 权限 E2E 用例收口
   - `frontend/tests/e2e/test_project_collab_permissions.spec.ts` 修复 strict locator 歧义，断言收敛至 `Commit actions` 容器。
4. 回归结果（Node 20）
   - `npm run typecheck`：通过
   - `npm run check:story`：通过（14 files / 85 tests）
   - `npm run check:i18n`：通过（used 1003 / dict 1112）
   - `npx playwright test tests/e2e/test_project_collab_permissions.spec.ts --project=chromium --workers=1`：2/2 通过

## 9. 当前架构结论（2026-02-18）

### 9.1 已完成的主线能力
- 四步剧情流主模型与 UI 主链路已落地
- timeline 叠加剧情事件层已落地
- ComfyUI 官方接口与 workflow 执行链已接入
- 分支边界锁（前端 + workspace 轻后端校验）已接入
- fork 与 branch 语义已完成后端与前端拆分

### 9.2 当前仍需持续推进点
- 进一步压缩 `editorStore` 复杂度（可拆到 story-specific slice）
- 持续补齐 i18n 文案一致性（目前已覆盖主链路，但仍有增量）
- 持续补全 Step3/Step4 的 E2E 自动推进链路（Step4 确认后跳下一节点并回到 Step2）
- 完整联调与全量 CI 通过率需要在稳定 Node/Python 环境下持续验证

## 10. 核心文件索引（主线）
- 阶段追踪：`plan/current_stage&FAQ.md`
- 后端路由汇总：`backend/app/api/v1/router.py`
- 项目协作与边界锁：`backend/app/api/v1/endpoints/projects.py`
- 生成接口：`backend/app/api/v1/endpoints/generation.py`
- ComfyUI 接口：`backend/app/api/v1/endpoints/comfyui_templates.py`
- 统一生成服务：`backend/app/services/generation_service.py`
- 编辑器状态：`frontend/src/store/editorStore.ts`
- story workflow 构建：`frontend/src/lib/editor/storyWorkflow.ts`
- story 进度规则：`frontend/src/lib/editor/storyProgress.ts`
- 工作流面板：`frontend/src/components/editor/WorkflowPanel.tsx`
- Step4 面板：`frontend/src/components/editor/story/Step4NodeRenderPanel.tsx`
- 事件层时间轴：`frontend/src/components/TimelineEditor.tsx`
