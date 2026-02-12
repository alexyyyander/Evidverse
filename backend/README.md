# Vidgit Backend

## Tech Stack
- FastAPI + Pydantic Settings
- SQLAlchemy (async) + Alembic
- Auth: JWT bearer
- Background jobs: Celery (RabbitMQ broker + Redis result backend)
- Storage: MinIO (S3-compatible)

## Local Dev

### 1) Start infrastructure
From repo root:

```bash
docker-compose up -d
```

### 2) Configure env
Create `backend/.env`:

```bash
cp ../.env.example .env
```

### 3) Run API server
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 4) Run worker (separate terminal)
```bash
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info
```

## Useful URLs
- API docs: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Tests
From repo root:

```bash
./backend/tests/run_tests.sh
```

Or run directly:
```bash
cd backend
pytest -q
```
