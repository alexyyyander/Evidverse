# Evidverse 云端架构（cloud_version）开发说明

## 背景与目标

Evidverse 面向“视频 GitHub”的核心诉求是：
- 线上提供一个可公开访问的示例网站（Discover/分类/标签/项目预览）
- 支持 Git 风格的项目历史（Commit DAG / Branch / Fork / Merge Request）
- 支持异步生成与导入（VN 导入、生成 clip、发布）

同时，这个项目要开源给普通用户使用：用户既可以只用本地数据，也可以选择连接到云端中心站点浏览公开内容。

因此建议把系统拆成两个运行形态：
- Local（开源本地版）：用户在本机运行（SQLite 或本机 Postgres + 本地对象存储/MinIO），用于私有编辑与生成
- Cloud（中心站点）：线上统一的 Postgres + 对象存储（S3/R2）+ Worker，用于公共浏览、发布、协作与运营

本分支 `cloud_version` 的目标是：
- 为云端部署提供明确的架构与落地路径（组件、网络、权限、运维）
- 让本地版可以“查询本地数据库 + 查询云端公开数据”（至少 Discover / Public Project）
- 提供可直接套用的云端基础部署文件（以 Kubernetes 为参考实现）

## 运行模式与数据来源

### 1) Local only（默认）
- 前端 `NEXT_PUBLIC_API_*` 指向本地后端
- 后端使用本地 DB（SQLite 或本机 Postgres）
- Discover/项目预览来自本地后端的 `/projects/feed`、`/projects/public/{id}`（仅在本地也可用）

### 2) Cloud only（中心站点/示例站）
- 前端设置 `NEXT_PUBLIC_APP_MODE=cloud`
- 前端 `NEXT_PUBLIC_API_ORIGIN` 指向云端后端
- 所有编辑与保存都直接写入云端 Postgres（没有本地来源切换）

### 3) Local + Cloud（推荐给开源普通用户）
- 前端设置 `NEXT_PUBLIC_APP_MODE=local`
- 本地后端仍用于登录/编辑/生成（私有数据）
- 前端额外配置一个“云端读取 API”用于：
  - 浏览云端公共内容（Discover / Public Project）
  - 查看“我在云端的项目列表”
  - 把云端项目一键导入到本地进行编辑

配置与数据流：
- `NEXT_PUBLIC_CLOUD_API_URL`：云端中心站点的 `/api/v1`
- 云端登录与 token：
  - 本地前端会维护一个独立的 cloud token（与本地 token 分离）
  - 用于调用云端的私有接口（例如 `/projects` 获取“我在云端的项目”）
- 导入到本地编辑：
  - 云端导出：`GET /api/v1/projects/{project_id}/export?branch_name=main`
  - 本地导入：`POST /api/v1/projects/import`（把导出 payload 写入本地 DB 并打开编辑器）

## 云端参考架构（推荐）

### 组件清单

云端中心站点建议包含：
- Frontend（Next.js）
  - 公开站点入口（Discover/Project Preview/登录注册/个人页）
  - 可部署为：Vercel（推荐）或容器（K8s）
- Backend API（FastAPI）
  - 统一对外 API：`/api/v1/*`
  - 鉴权：JWT Bearer
  - 负责签发对象存储的 presigned URL、元数据写入
- Worker（Celery）
  - 执行长任务（生成、导入解析、发布）
- Database（Postgres，强一致元数据）
  - 用户/项目/分支/提交/MR/标签/任务状态等
- Object Storage（S3/R2/MinIO，中心对象仓库）
  - 视频、图片、导入文件、渲染产物
- Redis（缓存/任务状态/结果后端）
- Broker（RabbitMQ 或 Redis）
  - Celery broker（生产环境建议 RabbitMQ）
- CDN（CloudFront/Cloudflare）
  - 公共视频/封面加速
- Observability（日志/指标/告警）
  - Sentry（可选）、Prometheus/Grafana、OpenTelemetry（可选）

### 流量与域名

推荐域名拆分：
- `app.evidverse.example`：前端站点
- `api.evidverse.example`：后端 API（FastAPI）
- `cdn.evidverse.example`：公共对象分发（CDN）

前端与 API 最好同站点或同根域，避免跨域复杂度；如果拆域名，务必配置 CORS 与 Cookie/Token 策略。

## 云端数据库（Postgres）要求与设计原则

云端数据库承担“中心真相”，必须满足：
- 强一致：权限/可见性/引用关系（Project/Branch/Commit/MR）必须可审计
- 高可用：备份、只读副本（可选）、迁移可控
- 可扩展：tags/分类/搜索/热度排序需要可运营扩展（可引入搜索服务）

原则：
- 大文件不入库：视频/图片等走对象存储，只在 DB 存引用（object_name、hash、size、visibility）
- 版本不可变：commit 快照不可变，方便缓存与追溯
- 公开内容可索引：is_public + tags/category/topic 用于 Discover

## 中心对象存储（S3/R2）实现要点

建议 bucket 默认私有，访问策略：
- 公共资源：通过 CDN 公开（或复制到 public bucket）
- 私有资源：后端生成短期 presigned URL

对象 key 建议包含“归属 + 不可变版本”：
- `projects/{project_public_id}/commits/{commit_sha}/...`
- `projects/{project_public_id}/assets/{asset_public_id}/...`

这样可以：
- 便于做生命周期策略（旧产物清理）
- 便于做去重（引入内容哈希路径时）
- 便于做权限审计与数据迁移

## 任务系统（Worker）与可扩展性

当前实现使用 Celery：
- Broker：RabbitMQ（推荐）或 Redis（轻量）
- Result backend：Redis

生产建议：
- worker 与 API 分离部署
- 任务入队/结果写回都走统一配置（环境变量）
- 任务输出产物写入对象存储，DB 只存引用与状态

## 配置规范（云端与本地统一）

### Backend 环境变量（关键）
- `DATABASE_URL`（云端推荐）：如 `postgresql+asyncpg://user:pass@host:5432/dbname`
- `SECRET_KEY`：JWT 密钥（云端必须放 Secret 管理）
- `CELERY_BROKER_URL`、`CELERY_RESULT_BACKEND`
- `S3_ENDPOINT_URL`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_BUCKET_NAME`、`S3_REGION_NAME`
- `BACKEND_CORS_ORIGINS`：前端域名白名单（云端必配）

### Frontend 环境变量（关键）
- `NEXT_PUBLIC_APP_MODE`：`cloud` 或 `local`
- `NEXT_PUBLIC_API_ORIGIN`：指向本地或云端 API origin（不带 `/api/v1`）
- `NEXT_PUBLIC_API_URL`：也可用，但建议统一用 ORIGIN 语义
- `NEXT_PUBLIC_CLOUD_API_URL`（local 模式可选）：云端中心站点 API（建议带 `/api/v1`）

## 部署参考实现（Kubernetes）

仓库内提供一个参考目录：
- `infrastructure/cloud/k8s/*`

使用方式（示意）：
1. 推送镜像（backend/worker/frontend）
2. 配置 Secret（DB/S3/JWT）
3. 先跑 migrate job（alembic upgrade head）
4. 再部署 backend/worker/frontend
5. 配置 Ingress 域名与 TLS

### 健康检查
云端建议保留简单健康检查接口：
- `GET /api/v1/health`

用于 K8s readiness/liveness 与监控探针。

## CI/CD（建议）

最小可行流程：
- main 合并后触发构建镜像（backend/worker/frontend）
- 推送到镜像仓库（GHCR/ECR）
- 部署系统（ArgoCD/GitHub Actions + kubectl/helm）拉取新镜像滚动更新
- 数据库迁移作为独立 job 执行（避免 API 启动时做不可控迁移）

## 备份与恢复（生产必须）

Postgres：
- 每日全量备份 + point-in-time recovery（PITR）
- 迁移版本与回滚策略明确（不可逆迁移要有替代方案）

对象存储：
- bucket 版本控制（可选）
- 生命周期策略（旧产物清理）
- 关键产物跨区域复制（可选）

## 开发落地建议（分阶段）

### 阶段 1：云端可跑 + 本地可连云端浏览
- 云端：Postgres + S3 + Redis + Broker + backend + worker
- 前端：支持 `NEXT_PUBLIC_CLOUD_API_URL` 读取云端 feed/public project

### 阶段 2：类目/视频族运营能力
- 引入 Category/Collection（或继续用 tags + 配置化栏目）
- 接入搜索服务（用于 Discover 搜索与排序）

### 阶段 3：多租户/协作（可选）
- 团队/协作者权限
- 项目协作 MR 审核与合并策略
