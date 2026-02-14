# Architecture

Yivid is a full-stack app that combines:
- a Git-like project history model (commits/branches),
- an in-browser video editor (timeline + preview),
- async AI generation workflows (Celery tasks that produce assets and store them in S3/MinIO).

## Components

### Frontend (Next.js)
- App Router routes live in `frontend/src/app/`
  - `(app)`: standard pages
    - `/`: Home
    - `/discover`: Public feed
    - `/project/[id]`: **Project Detail Page** (Overview, Git Graph, Branches, MRs)
    - `/login`, `/register`: Auth
  - `(editor)`: fullscreen editor layout (`/editor/[id]`)
- HTTP layer:
  - axios client + interceptors in `frontend/src/lib/api/client.ts`
  - typed domain APIs in `frontend/src/lib/api/domains/*`
  - server-state caching in `frontend/src/lib/queries/*` (React Query)
- Editor:
  - shell + panels in `frontend/src/components/editor/*`
  - timeline local state in `frontend/src/store/timelineStore.ts`

### Backend (FastAPI)
- API prefix: `/api/v1`
- Core slices:
  - `backend/app/api/v1/`: API routes
  - `backend/app/models/`: DB models
  - `backend/app/schemas/`: API schemas
  - `backend/app/workers/`: Celery tasks
- Auth:
  - JWT bearer tokens
  - login uses form-urlencoded `username/password`

### Worker (Celery)
- Broker: RabbitMQ
- Result backend: Redis
- Runs long workflows (script → image → video → upload)
- Returns a structured result that the frontend polls via `/api/v1/tasks/{task_id}`

### Persistence & Storage
- Postgres: project, commit/branch DAG, timeline state, metadata
- MinIO (S3): generated images/videos; backend returns public URLs for preview/download

## Key Flows

### Login
1. Frontend submits form to `POST /api/v1/auth/login` (`application/x-www-form-urlencoded`)
2. Backend returns `{ access_token, token_type }`
3. Frontend stores token in `localStorage` and injects `Authorization: Bearer ...` on requests

### Generate clip (async)
1. `POST /api/v1/generate/clip` → `{ task_id }`
2. Frontend polls `GET /api/v1/tasks/{task_id}` until `SUCCESS` or `FAILURE`
3. Worker uploads artifacts to MinIO and returns `image_url` / `video_url`

### Editor save
- Editor timeline store persists the workspace to the project endpoint (server-state boundary is kept in API + React Query; timeline editing stays in zustand).

## Ports (local dev)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000` (docs at `/docs`)
- Postgres: `5432`
- Redis: `6379`
- RabbitMQ: `5672` (console `15672`)
- MinIO: `9000` (console `9001`)

