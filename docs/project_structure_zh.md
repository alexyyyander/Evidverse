# Yivid 项目结构总览（可维护版）

本文目标：用一份文档把 Yivid 仓库的模块边界、关键入口与常见改动落点讲清楚，方便快速上手与协作开发。

## 1. 仓库定位

Yivid 是一个 Monorepo，核心能力是「AI 视频生成 + Web 可视化编辑器 + 类 Git 版本控制（commit/branch/fork/merge）+ 社区/发布」，整体由以下组件构成：

- Frontend：Next.js 14 Web 应用（编辑器、项目页、社区页、发布页）
- Backend：FastAPI API 服务（业务模型、鉴权、版本控制逻辑、导入导出、发布、VN 解析等）
- Worker：Celery 异步任务（生成/导出/发布/VN 解析等长任务）
- AI Engine：与模型/外部推理服务交互的客户端与适配层（Seedance/SD/LLM）
- Infra：Docker Compose / Nginx /（可选）K8s 部署资源

更宏观的数据流与接口说明可参考：
- [architecture.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/docs/architecture.md)
- [developer_guide.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/docs/developer_guide.md)

## 2. 顶层目录速览

```
yivid/
├── ai_engine/               AI 引擎适配层（LLM / Seedance / Stable Diffusion）
├── backend/                 FastAPI 后端 + Alembic + Pytest
├── cli/                     Python CLI（yivid 命令行）
├── docs/                    文档（架构、开发指南、设计说明）
├── frontend/                Next.js 前端（App Router + Tailwind + React Query + Zustand）
├── infrastructure/          云端部署资源（当前主要为 K8s YAML）
├── nginx/                   prod-like 反向代理配置（/ -> 前端，/api -> 后端）
├── plan/                    Roadmap 与阶段计划（current_stage&FAQ 是单一真相源）
├── structure/               历史结构说明与任务分解（偏规划性质）
├── docker-compose.yml       本地基础设施（db/redis/rabbitmq/minio + bucket init）
└── docker-compose.prod.yml  prod-like 全栈 compose（含 nginx/worker 等）
```

## 3. Backend（FastAPI）结构与入口

### 3.1 入口与路由聚合

- FastAPI 入口：[main.py](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/backend/app/main.py)
- API 路由总入口：[router.py](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/backend/app/api/v1/router.py)
- API 前缀：`/api/v1`

`router.py` 会把各个业务域的 endpoint 挂载到统一路由上（auth/users/projects/files/generation/anchors/commits/branches/tasks/publish/vn/clips/merge_requests/health）。

### 3.2 目录职责（建议把改动落到对应层）

- `backend/app/api/v1/endpoints/`：HTTP 层（参数校验、依赖注入、调用 service、返回 schema）
- `backend/app/services/`：业务逻辑层（推荐把可测试逻辑放这里）
- `backend/app/models/`：SQLAlchemy ORM 模型（DB 表结构）
- `backend/app/schemas/`：Pydantic Schema（请求/响应结构）
- `backend/app/workers/`：Celery tasks（长任务/IO 密集/需要异步排队的工作）
- `backend/app/core/`：配置、鉴权、安全、缓存、Celery 初始化等

### 3.3 Worker（Celery）入口

- Celery app 初始化：[celery_app.py](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/backend/app/core/celery_app.py)
- 注册任务 include：`app.workers.*`（workflow/video/image/publish/vn 等）

## 4. Frontend（Next.js）结构与入口

### 4.1 路由结构（App Router）

- 路由目录：`frontend/src/app/`
- Route Group：
  - `(app)`：常规页面
    - `/`：首页
    - `/discover`：发现页
    - `/projects`：我的项目
    - `/project/[id]`：**项目详情页**（概览、Git Graph、分支、MR）
    - `/profile/[id]`：用户主页
    - `/login`, `/register`：认证
  - `(editor)`：编辑器全屏布局与页面 (`/editor/[id]`)

### 4.2 数据层（HTTP/API/Server State）

推荐心智模型：**api（axios + typed domains）** → **queries（React Query）** → **components/pages**。

- axios client + token 注入与错误归一化：[client.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/frontend/src/lib/api/client.ts)
- 领域 API 聚合导出：[index.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/frontend/src/lib/api/index.ts)
- 领域 API 实现：`frontend/src/lib/api/domains/*`
  - 示例（云端项目域）：[cloud_projects.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/frontend/src/lib/api/domains/cloud_projects.ts)
  - 云端 client（可选启用）：[cloudClient.ts](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/frontend/src/lib/api/cloudClient.ts)

### 4.3 编辑器状态（Client State）

- `frontend/src/store/`：本地编辑状态（如时间轴 store 等）
- `frontend/src/components/editor/`：编辑器壳层与各面板模块

## 5. AI Engine（ai_engine）结构与入口

AI Engine 更像「外部能力适配层」，被 backend service / worker 调用：

- LLM client：`ai_engine/llm/client.py`
- Seedance client：`ai_engine/seedance/client.py`
- Stable Diffusion client：`ai_engine/stable_diffusion/client.py`
- 依赖清单：[ai_engine/requirements.txt](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/ai_engine/requirements.txt)

## 6. CLI（cli）结构与入口

CLI 用于把核心能力以命令行形式暴露给 power user / 自动化：

- CLI 入口：`cli/yivid/main.py`
- API 访问封装：`cli/yivid/api.py`
- 配置与上下文：`cli/yivid/config.py`、`cli/yivid/context.py`
- 测试：`cli/tests/test_cli.py`

## 7. Infra & 部署相关

### 7.1 本地 infra（推荐开发方式）

- [docker-compose.yml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/docker-compose.yml)：db/redis/rabbitmq/minio + createbuckets
- 数据库建议：本地与云端运行环境统一使用 PostgreSQL；本地用 `docker-compose.yml` 起 Postgres，云端用 `docker-compose.prod.yml` 或 K8s 接入 Postgres

### 7.2 prod-like 全栈（Nginx + 前后端 + worker）

- `docker-compose.prod.yml`（根目录）
- Nginx 反代配置：[default.conf](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/nginx/conf.d/default.conf)
  - `/` → frontend
  - `/api/`、`/docs`、`/openapi.json` → backend

### 7.3 云端（K8s）

- `infrastructure/cloud/k8s/*.yaml`：backend/frontend/worker/migrate-job/ingress 等
- 说明：[infrastructure/cloud/README.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/infrastructure/cloud/README.md)

## 8. Plan & 文档（“单一真相源”）

开发流程与当前阶段以此为准：
- [current_stage&FAQ.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/plan/current_stage&FAQ.md)

Stage 计划：
- `plan/stage_plan/`：MVP 20 stages
- `plan/stage_plan_dev_v2/`：Dev v2（导出投稿 / VN 导入 / 协作深化 / 剧情关系图）
- `plan/stage_plan_frontend*`：前端美化与重构路线

## 9. 常见改动落点（“我应该改哪里？”）

- 新增/修改后端 API：
  - endpoint：`backend/app/api/v1/endpoints/`
  - service：`backend/app/services/`
  - schema：`backend/app/schemas/`
  - model：`backend/app/models/`
  - 别忘了在 [router.py](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/backend/app/api/v1/router.py) 注册路由
- 新增前端 API 调用：
  - domain：`frontend/src/lib/api/domains/*.ts`
  - 统一导出：`frontend/src/lib/api/index.ts`
  - server-state：`frontend/src/lib/queries/`（如果该数据需要缓存/重试/失效）
- 编辑器交互与状态：
  - UI：`frontend/src/components/editor/`
  - 状态：`frontend/src/store/`
- 异步任务（生成/导出/发布/VN 解析）：
  - worker tasks：`backend/app/workers/`
  - service 入口：`backend/app/services/`
  - 前端轮询：通常走 `/api/v1/tasks/{task_id}`

## 10. 运行与测试入口

快速启动与排障指南：
- [README.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/README.md)
- [developer_guide.md](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/docs/developer_guide.md)

测试脚本入口：
- 后端：`./backend/tests/run_tests.sh`（见 [run_tests.sh](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/backend/tests/run_tests.sh)）
- 前端：`./frontend/tests/run_tests.sh`（见 [run_tests.sh](file:///mnt/c/Users/dubdoo/Desktop/individual_project/yivid/frontend/tests/run_tests.sh)）
- 后端测试数据库：默认用内存 SQLite；如需用 PostgreSQL 跑集成测试，可设置 `TEST_DATABASE_URL=postgresql+asyncpg://...`
