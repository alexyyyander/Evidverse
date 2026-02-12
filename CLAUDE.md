# CLAUDE.md - Vidgit Development Guidelines

## 🌟 Golden Rule
**ALWAYS check `plan/current_stage&FAQ.md` before starting any development task.**
This file is the Single Source of Truth for project status, next actions, and operational guides.
You have to use git commit after each stage test is passed.
## 🚀 Workflow
1. **Check Status**: Read `current_stage&FAQ.md` to identify the active stage (e.g., "Stage 01") and remember to update the current stage if it's finished. Publish the FAQ in it if it's finished.
2. **Read Plan**: Open the corresponding stage plan (e.g., `plan/stage_plan_dev_v2/stage_*.md`) to understand the goals and functional requirements.
3. **Execute**: Implement the features listed in the "Todo List" of the stage plan.
4. **Update**:
   - Mark completed items in the `stage_XX.md` todo list.
   - If the stage is finished, update `current_stage&FAQ.md` to point to the next stage.
5. **Commit**: Use meaningful commit messages referencing the stage (e.g., "feat(stage01): implement user model").
6. **Version Management**: Use git to save meaningful code changes. Avoid committing large files or binary data. Use gitignore to exclude unnecessary files. Commit frequently. You have to commit after each stage test is passed.
7. **Auto Unit Test**: Auto fully test the code before submit and consider totally to avoid bugs. Use pytest for backend and Playwright (E2E) for frontend (unit test framework can be added later if needed). Do not skip any test. Try all test with auto bash script in `backend/tests/` and `frontend/tests/`.

## 🎯 当前工作目标 (Updated)
- **已达成（阶段性）**：20 个 Stage 的 MVP 功能已完成（后端、AI 工作流、CLI、社区页、部署与 CI/CD 等）。
- **当前目标**：对前端进行“美化 + 重构”，让 UI 更有设计感、组件更可复用、API/状态更清晰、测试与工程规范更健壮。
- **（已达成）前端重构计划**：见 `plan/stage_plan_frontend/`（未来 10 个前端重构 Stage 的路线图）。
- **（开发中）Dev v2 开发计划**：见 `plan/stage_plan_dev_v2/`（导出投稿 + 协作分支 + 多世界线）

## 🛠️ Common Commands
- **Infra (dev)**: `docker-compose up -d`
- **Backend Dev**:
  - `cp .env.example backend/.env`
  - `cd backend && uvicorn app.main:app --reload`
- **Worker (Celery)**: `cd backend && celery -A app.core.celery_app worker --loglevel=info`
- **Frontend Dev**: `cd frontend && npm run dev`
- **DB Migration**: `cd backend && alembic revision --autogenerate && alembic upgrade head`

### Dev v2: Publish / Export
- **Bilibili**: install `biliup` or set `BILIUP_BIN=/path/to/biliup`
- **Douyin (experimental)**: set `DOUYIN_UPLOADER_CMD` (uses `{video_path}`, `{credential_path}`, `{title}`, `{description}`)
- **Export concat**: `ffmpeg` must be available in PATH
- **Docker (prod-like)**:
  - `docker-compose -f docker-compose.prod.yml up -d --build`
  - Ensure the worker container has `ffmpeg` in PATH.
  - Ensure the worker container can execute `biliup` (install or mount it and set `BILIUP_BIN`).
  - Create `S3_BUCKET_NAME` (default `vidgit-bucket`) in MinIO.

## 🧩 Project Structure
- `backend/`: FastAPI application
- `frontend/`: Next.js application
- `ai_engine/`: AI logic and pipelines
- `plan/`: Roadmaps & stage plans (`stage_plan_dev_v2/`, `stage_plan_frontend/`, etc.)

---
*Follow these rules to ensure smooth collaboration and progress tracking.*
