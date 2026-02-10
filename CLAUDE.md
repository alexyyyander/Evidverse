# CLAUDE.md - Vidgit Development Guidelines

## 🌟 Golden Rule
**ALWAYS check `plan/stage_plan/current_stage&FAQ.md` before starting any development task.**
This file is the Single Source of Truth for project status, next actions, and operational guides.

## 🚀 Workflow
1. **Check Status**: Read `current_stage&FAQ.md` to identify the active stage (e.g., "Stage 01") and remember to update the current stage if it's finished. Publish the FAQ in it if it's finished.
2. **Read Plan**: Open the corresponding stage plan (e.g., `plan/stage_plan/stage_01.md`) to understand the goals and functional requirements.
3. **Execute**: Implement the features listed in the "Todo List" of the stage plan.
4. **Update**:
   - Mark completed items in the `stage_XX.md` todo list.
   - If the stage is finished, update `current_stage&FAQ.md` to point to the next stage.
5. **Commit**: Use meaningful commit messages referencing the stage (e.g., "feat(stage01): implement user model").
6. **Version Management**: Use git to save meaningful code.
7. **Auto Unit Test**: Auto fully test the code before submit and consider totally to avoid bugs. Use pytest for backend and jest for frontend. Do not skip any test. Try all test with auto bash script in `backend/tests/` and `frontend/tests/`.

## 🛠️ Common Commands
- **Backend Dev**: `cd backend && uvicorn app.main:app --reload`
- **Frontend Dev**: `cd frontend && npm run dev`
- **DB Migration**: `cd backend && alembic revision --autogenerate && alembic upgrade head`
- **Docker**: `docker-compose up -d`

## 🧩 Project Structure
- `backend/`: FastAPI application
- `frontend/`: Next.js application
- `ai_engine/`: AI logic and pipelines
- `cli/`: Python command-line tool
- `plan/stage_plan/`: Detailed development stages

---
*Follow these rules to ensure smooth collaboration and progress tracking.*
