# Current Stage & FAQ

> **当前开发进度追踪与常见问题指南**
> 每次开始开发前，请务必查看此文件以确认当前状态和目标。

## 📍 Current Status
**Current Stage**: [Stage 02: 用户认证](./stage_02.md)
**Status**: 🚀 Ready to Start
**Last Updated**: 2026-02-11

## 📅 Stage Roadmap
- [x] **Stage 01**: 环境与数据库
- [ ] **Stage 02**: 用户认证 (Current)
- [ ] **Stage 03**: 核心模型 CRUD
- [ ] **Stage 04**: 任务队列与存储
- [ ] **Stage 05**: Seedance 集成
- [ ] ... (See individual files for details)

## 🛠️ Quick Actions
- **启动开发环境**:
  ```bash
  docker-compose up -d  # 启动 DB/Redis/MQ
  cd backend && source venv/bin/activate && uvicorn app.main:app --reload
  cd frontend && npm run dev
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
A: 检查端口是否被占用 (5432, 6379, 5672)。使用 `docker logs <container_id>` 查看详细报错。

### Q: 数据库连接不上 (ConnectionRefusedError)？
A:
1. 确保 Docker 容器已启动: `docker-compose up -d`。
2. 确保 `.env` 文件中的 `DATABASE_URL` host 是 `localhost` (本地开发时) 而不是 `db`。
3. 如果是 WSL2 环境，确保 Docker Desktop 开启了 WSL 集成。

### Q: Alembic 找不到模型？
A: 确保在 `backend/app/models/__init__.py` 中导入了所有模型，并且在 `backend/alembic/env.py` 中正确导入了 `Base`。

### Q: 依赖安装慢？
A: 尝试更换 PyPI 镜像源或 npm 镜像源。

---
*Maintainer: Vidgit Bot*
