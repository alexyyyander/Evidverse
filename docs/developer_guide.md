# Vidgit Developer Guide

## Architecture

Vidgit is a full-stack app with async AI workflows. At a high level:

```text
Browser (Next.js)
   |
   | HTTP (JSON / form-urlencoded)
   v
FastAPI (/api/v1)
   |
   | DB writes/reads              async jobs
   v                              v
Postgres  <-------------------  Celery Worker
   ^                              |
   |                              | AI calls + uploads
   +----------- MinIO (S3) <------+
```

### Backend
- **Runtime**: FastAPI + Pydantic Settings + SQLAlchemy (async) + Alembic
- **Auth**: JWT bearer tokens
- **Async jobs**: Celery (RabbitMQ broker + Redis result backend)
- **Asset storage**: MinIO (S3-compatible), stores generated images/videos and returns public URLs

Key directories:
- `backend/app/api/v1/`: route definitions and dependency injection
- `backend/app/models/`: SQLAlchemy models (projects/commits/branches/anchors, etc.)
- `backend/app/schemas/`: Pydantic request/response shapes
- `backend/app/workers/`: Celery tasks (image/video/workflow orchestration)
- `ai_engine/`: adapters/clients for LLM / Stable Diffusion / Seedance

### Frontend
- **Runtime**: Next.js App Router + TypeScript + Tailwind
- **Server-state**: React Query (`src/lib/queries/*`)
- **Client-state**: zustand (editor timeline store)
- **Visualization**: ReactFlow (Git graph), timeline editor component for clip sequencing

Key directories:
- `frontend/src/app/`: routes (route groups `(app)` and `(editor)`)
- `frontend/src/components/`: UI modules (editor modules under `components/editor/`)
- `frontend/src/lib/api/`: axios client + typed domain APIs

### Core Data Flows

#### Auth
- Register: `POST /api/v1/auth/register` (JSON `{ email, password }`)
- Login: `POST /api/v1/auth/login` (form-urlencoded `username=<email>&password=...`)
- Current user: `GET /api/v1/users/me` (Authorization: Bearer ...)

Frontend stores token in `localStorage` and injects `Authorization` header via axios interceptor.

#### Generate Video (async)
1. Frontend calls `POST /api/v1/generate/clip` with `{ topic }` → returns `{ task_id }`
2. Frontend polls `GET /api/v1/tasks/{task_id}` until SUCCESS/FAILURE
3. Worker orchestrates AI calls and uploads generated assets to MinIO, returning `image_url` / `video_url` in the task result

#### Git-like version control
- Backend maintains commit DAG and branch heads per project
- Frontend renders the DAG via ReactFlow in the editor “History” tab and allows fork/add-to-timeline actions

#### Branch-scoped workspace (Dev v2)
- Editor saves/loads workspace per branch (instead of storing a single `workspace_data` on Project):
  - `GET /api/v1/projects/{project_id}/workspace?branch_name=<name>`
  - `PUT /api/v1/projects/{project_id}/workspace?branch_name=<name>`
- Fork as branch (public project collaboration):
  - `POST /api/v1/projects/{project_id}/fork-branch`
- Editor supports `?branch=<branchName>` and includes a branch switcher in the header.

#### Publish/export (Dev v2 Stage 01)
- Accounts + jobs:
  - `POST /api/v1/publish/accounts`, `GET /api/v1/publish/accounts`
  - `POST /api/v1/publish/jobs`, `GET /api/v1/publish/jobs/{job_id}`
- Video source selection:
  - If `video_url` is provided, the job publishes that file/URL.
  - If `project_id + branch_name` are provided, backend resolves the branch HEAD video source.
  - If HEAD contains multiple clip video URLs, the worker exports a single mp4 via `ffmpeg` and uploads to MinIO/S3 before publishing.
- Worker runtime requirements (local/dev):
  - `ffmpeg` must be available in PATH for export/concat.
  - Bilibili publishing uses `biliup` (set `BILIUP_BIN` if not in PATH).
  - Douyin publishing is experimental via external command template `DOUYIN_UPLOADER_CMD`.

## Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Optional (Dev v2 publishing): `ffmpeg`, `biliup`

### Option A: Local dev (recommended)

1) Start infra services:
```bash
docker-compose up -d
```

2) Create `backend/.env`:
```bash
cp .env.example backend/.env
```
Edit values if needed (notably `POSTGRES_*`, `CELERY_*`, `S3_*`).

3) Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

4) Worker (in another terminal):
```bash
cd backend
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info
```

5) Frontend:
```bash
cd frontend
npm i
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs
- MinIO console: http://localhost:9001
- RabbitMQ console: http://localhost:15672 (guest/guest)

### Option B: Full stack in Docker (prod-like)
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Access:
- Frontend: http://localhost
- Backend docs: http://localhost/docs

Production notes:
- MinIO bucket:
  - `docker-compose.prod.yml` does not create buckets automatically.
  - Create `S3_BUCKET_NAME` (default `vidgit-bucket`) and optionally set it public if you rely on direct asset URLs.
- Dev v2 publish/export:
  - The worker container must have `ffmpeg` available in PATH (used for concat/export).
  - Bilibili upload uses `biliup` CLI; install it in the worker image or provide it in PATH and set `BILIUP_BIN` if needed.
  - Douyin upload is experimental and runs an external command template `DOUYIN_UPLOADER_CMD`.

## Testing
- Backend: `./backend/tests/run_tests.sh`
- Backend (direct): `cd backend && pytest -q`
- Frontend: `./frontend/tests/run_tests.sh` (runs the full quality gate)
- Load test: `locust -f backend/tests/locustfile.py`

## CI/CD
GitHub Actions pipelines live in `.github/workflows/`:
- `ci.yml`: runs checks/tests
- `deploy.yml`: deployment workflow
