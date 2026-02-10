# Stage 01: 环境初始化与数据库设计

## 目标
搭建后端开发环境，设计并实现核心数据库模型，确保可以通过 Alembic 进行数据库迁移。

## 功能列表
1. **环境配置**: 完善 `docker-compose.yml` 和 `.env` 配置。
2. **数据库连接**: 配置 SQLAlchemy (Async) 连接 PostgreSQL。
3. **模型定义**: 实现 `User`, `Project`, `Commit`, `Branch`, `Tag` 等基础模型。
4. **迁移系统**: 初始化 Alembic 并生成第一次迁移脚本。

## Todo List
- [x] 完善 `backend/app/core/config.py`，加载环境变量。
- [x] 创建 `backend/app/core/db.py`，配置 `AsyncSession`。
- [x] 定义 `backend/app/models/base.py`。
- [x] 实现 `User` 模型 (id, email, hashed_password, ...)。
- [x] 实现 `Project` 模型 (id, name, owner_id, ...)。
- [x] 实现 `Commit` 模型 (id, message, parent_hash, video_url, ...)。
- [x] 实现 `Branch` 模型 (id, name, head_commit_id, ...)。
- [x] 配置 `alembic.ini` 和 `backend/alembic/env.py`。
- [x] 执行 `alembic revision --autogenerate` 并应用迁移。
- [x] 验证数据库连接和表创建成功。
