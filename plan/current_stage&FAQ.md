# Current Stage & FAQ

> **当前开发进度追踪与常见问题指南**
> 每次开始开发前，请务必查看此文件以确认当前状态和目标。

## 📍 Current Status
**Current Stage**: [Stage6](./stage_plan_frontend/stage_06.md)
**Status**: pending
**Last Updated**: 2026-02-11

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

## 🎉 Project Milestones
- **MVP Delivered**: All core features including Video Editing, Git Version Control, and AI Generation are implemented.
- **Production Ready**: Docker configurations and CI/CD pipelines are set.
- **Documentation**: User and Developer guides are available in `docs/`.

- [ ] ... (See individual files for details)

## 🛠️ Quick Actions
- **启动开发环境**:
  ```bash
  docker-compose up -d  # 启动 DB/Redis/MQ/MinIO
  cd backend && source venv/bin/activate && uvicorn app.main:app --reload
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
2. 确保 `.env` 文件中的 `DATABASE_URL` host 是 `localhost` (本地开发时) 而不是 `db`。
3. 如果是 WSL2 环境，确保 Docker Desktop 开启了 WSL 集成。

### Q: Alembic 找不到模型？
A: 确保在 `backend/app/models/__init__.py` 中导入了所有模型，并且在 `backend/alembic/env.py` 中正确导入了 `Base`。

### Q: 依赖安装慢？
A: 尝试更换 PyPI 镜像源或 npm 镜像源。

### Q: Passlib bcrypt 报错 `ValueError: password cannot be longer than 72 bytes`?
A: 这是一个已知的 `passlib` 和新版 `bcrypt` 的兼容性问题。解决方案是将 `bcrypt` 降级到 `4.0.1`。

### Q: MinIO 访问被拒绝？
A: 确保 `docker-compose.yml` 中的 `MINIO_ROOT_USER` 和 `MINIO_ROOT_PASSWORD` 与 `backend/app/core/config.py` 中的配置一致。默认是 `minioadmin`/`minioadmin`。

---
*Maintainer: Vidgit Bot*
