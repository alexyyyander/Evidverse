# Current Stage & FAQ

> **当前开发进度追踪与常见问题指南**
> 每次开始开发前，请务必查看此文件以确认当前状态和目标。

## 📍 Current Status
**Current Stage**: [Frontend Optimization - Stage 05/07: Detail Page & Navigation](./stage_plan_frontend/README.md)
**Status**: in_progress
**Last Updated**: 2026-02-14

## FAQ（阶段切换）
### Q: 为什么点击项目不再直接进入编辑器？
- A: 我们引入了 **Project Detail Page (项目详情页)** (`/project/[id]`) 作为项目的门户。
  - 在详情页可以查看项目简介、作者、统计数据、提交历史图谱 (Git Graph) 和分支列表。
  - 点击 "Open Editor" (如果是 Owner) 或 "Fork & Edit" (如果是访客) 才会进入编辑器 (`/editor/[id]`)。
  - 这样区分了 "浏览/协作" 与 "深度编辑" 的场景。

### Q: Stage 01 的投稿任务失败了，怎么排查？
- A: 先到 /publish 查看 Job 的 logs / result；必要时用 retry 重试。若开启自动重试，会进入 retrying 并按退避重排队。

### Q: 如何上传 VN 导入素材？
- A: 先用 /files/presigned-url 获取 object_name，再创建 VNAsset 记录（/vn/assets），后续解析会基于 VNAsset 进行。

### Q: VN 脚本导入最小链路是什么？
- A: 先用 /vn/parse-preview 做文本预览；确认 OK 后用 /vn/parse-jobs 创建异步解析任务，按 /vn/parse-jobs/{id} 轮询并读取 logs。

### Q: 前端如何使用 VN 导入？
- A: 进入 Editor 左侧 VN Tab，可直接上传素材并创建解析任务（脚本预览、Job 状态与 logs 都在同一处）。

### Frontend Optimization v1（进行中）
- 目标：把“视频编辑页面”做得足够高级与复杂（点子→剧本→人物→生成→时间轴联动）
- 进展：已完成 Project Detail Page 重构、i18n 基础建设、首页布局修复。
- 计划：仅 3 个阶段，见 [stage_plan_frontend_v1/README](./stage_plan_frontend_v1/README.md)

### Dev v2（计划中）
- 目标：把“创作 → 协作 → 发行”升级为可规模化模型（多平台投稿、主项目+分支协作、多世界线剧情与可视化）
- 计划：4 个阶段，见 [stage_plan_dev_v2/README](./stage_plan_dev_v2/README.md)

## 📅 Stage Roadmap
- [x] **Stage 01**: 环境与数据库
- [x] **Stage 02**: 用户认证
- [x] **Stage 03**: 核心模型 CRUD
- [x] **Stage 04**: 任务队列与存储
- [x] **Stage 05**: Seedance 集成
- [x] **Stage 06**: Stable Diffusion 角色生成
- [x] **Stage 07**: 角色一致性锚点 (MVP)
- [x] **Stage 08**: 视频生成工作流编排
- [x] **Stage 09**: 前端视频编辑器
- [x] **Stage 10**: Git 核心逻辑 - Commit
- [x] **Stage 11**: Git 核心逻辑 - Branch & Checkout
- [x] **Stage 12**: 视频流可视化 (Git Graph)
- [x] **Stage 13**: 项目部署与 CI/CD
- [x] **Stage 14**: Web 项目导入与 Fork
- [x] **Stage 15**: Web 简易时间轴编辑器
- [x] **Stage 16**: CLI 工具基础
- [x] **Stage 17**: CLI 高级功能
- [x] **Stage 18**: 社区功能 - 分享与发现
- [x] **Stage 19**: 系统集成测试与性能优化
- [x] **Stage 20**: 部署与发布准备 (Completed)

## 🧭 Dev v2 Stage Plan
- [ ] **Dev v2 - Stage 01**: 导出与投稿（B 站 / 抖音）
- [x] **Dev v2 - Stage 02**: Galgame/VN → 多世界线番剧（截图 + 引擎脚本导入）
- [ ] **Dev v2 - Stage 03**: Fork/Branch 协作深化（Merge、ClipSegment、归因）
- [ ] **Dev v2 - Stage 04**: 剧情关系图与剧情拓展线路（可视化 + 生成 + 贡献统计）

## 🎉 Project Milestones
- **MVP Delivered**: All core features including Video Editing, Git Version Control, and AI Generation are implemented.
- **Production Ready**: Docker configurations and CI/CD pipelines are set.
- **Documentation**: User and Developer guides are available in `docs/`.

- [ ] ... (See individual files for details)

## 🛠️ Quick Actions
- **启动开发环境**:
  ```bash
  docker-compose up -d  # 启动 DB/Redis/MQ/MinIO + 创建 bucket
  cp .env.example backend/.env
  cd backend && source venv/bin/activate && alembic upgrade head && uvicorn app.main:app --reload
  cd frontend && npm run dev
  ```
- **启动 Celery Worker**:
  ```bash
  cd backend && source venv/bin/activate
  celery -A app.core.celery_app worker --loglevel=info
  ```
- **数据库迁移**:
  ```bash
  cd backend
  alembic revision --autogenerate -m "message"
  alembic upgrade head
  ```
- **运行测试**:
  ```bash
  ./backend/tests/run_tests.sh
  ```

## ❓ FAQ & Troubleshooting

### Q: Docker 容器启动失败？
A: 检查端口是否被占用 (5432, 6379, 5672, 9000, 9001)。使用 `docker logs <container_id>` 查看详细报错。

### Q: 数据库连接不上 (ConnectionRefusedError)？
A:
1. 确保 Docker 容器已启动: `docker-compose up -d`。
2. 确保 `backend/.env` 里 `POSTGRES_SERVER=localhost`（本地跑后端时），而不是 `db`（Docker 网络内）。
3. 如果是 WSL2 环境，确保 Docker Desktop 开启了 WSL 集成。

### Q: Alembic 找不到模型？
A: 确保在 `backend/app/models/__init__.py` 中导入了所有模型，并且在 `backend/alembic/env.py` 中正确导入了 `Base`。

### Q: 依赖安装慢？
A: 尝试更换 PyPI 镜像源或 npm 镜像源。

### Q: Passlib bcrypt 报错 `ValueError: password cannot be longer than 72 bytes`?
A: 这是一个已知的 `passlib` 和新版 `bcrypt` 的兼容性问题。解决方案是将 `bcrypt` 降级到 `4.0.1`。

### Q: MinIO 访问被拒绝？
A: 确保 `docker-compose.yml` 中的 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD` 与 `backend/app/core/config.py` 中的配置一致。默认是 `minioadmin`/`minioadmin`。

### Q: Publish（投稿）失败，提示找不到 biliup / ffmpeg？
A:
1. B 站上传依赖 `biliup`：安装到 Celery worker 机器上，或设置 `BILIUP_BIN=/path/to/biliup`。
2. 多片段导出依赖 `ffmpeg`：确保 worker 环境 PATH 中可执行 `ffmpeg`。
3. 抖音投稿为实验性：需要配置 `DOUYIN_UPLOADER_CMD`（外部 uploader 命令模板）。

### Q: docker-compose.prod.yml 启动后投稿/导出失败？
A:
1. prod compose 默认不会自动创建 MinIO bucket：请创建 `S3_BUCKET_NAME` 指定的 bucket（默认 `evidverse-bucket`），并按需要设置 public。
2. prod 的 worker 容器需要包含 `ffmpeg` 与 `biliup`：建议把它们安装进 backend/worker 镜像，或挂载二进制并设置 `BILIUP_BIN`。

---
*Maintainer: Evidverse Bot*
