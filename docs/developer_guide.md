# Vidgit Developer Guide

## Architecture

Vidgit is built with a modern tech stack:
- **Backend**: Python FastAPI, SQLAlchemy (Async), Pydantic.
- **Frontend**: Next.js (React), Tailwind CSS, ReactFlow (Graph).
- **Database**: PostgreSQL (Data), Redis (Cache/Queue).
- **Storage**: MinIO (S3 compatible) for video assets.
- **AI Engine**: Integrated with Stable Diffusion and Seedance (Mocked/Stubbed).

## Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### Quick Start
1.  **Clone the repo**:
    ```bash
    git clone https://github.com/yourusername/vidgit.git
    cd vidgit
    ```

2.  **Start Infrastructure**:
    ```bash
    docker-compose up -d
    ```
    This spins up Postgres, Redis, RabbitMQ, and MinIO.

3.  **Backend Setup**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    # Run migrations
    alembic upgrade head
    # Start server
    uvicorn app.main:app --reload
    ```

4.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

5.  **Access**:
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:8000/docs
    - MinIO Console: http://localhost:9001

## Deployment

### Production Docker
Use `docker-compose.prod.yml` for a production-ready setup with Nginx reverse proxy.
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### CI/CD
GitHub Actions pipelines are configured in `.github/workflows/`:
- `ci.yml`: Runs tests and checks build on Pull Requests.
- `deploy.yml` (Planned): Deploys to production on tag push.

## Testing
- **Backend**: `pytest`
- **Frontend**: `npm test` (Unit), `npx playwright test` (E2E)
- **Load Test**: `locust -f backend/tests/locustfile.py`
