# 🎬 Vidgit

> **AI-Powered Video Editor meets Git Version Control.**  
> Create, version, branch, and share your AI-generated video projects with the workflow developers love.

![Vidgit Status](https://img.shields.io/badge/Status-MVP%20Ready-success)
![Version](https://img.shields.io/badge/version-v0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Vidgit is a revolutionary platform that brings **Git-like version control** to the world of **AI video generation**. It allows creators to experiment fearlessly with different prompts, characters, and editing styles by managing their project history as a tree of commits and branches.

---

## ✨ Key Features

### 🤖 AI Video Generation
- **Text-to-Video**: Generate video clips from text prompts using integrated Stable Diffusion pipelines.
- **Character Consistency**: Maintain character identity across different scenes with our Anchor system.
- **Workflow Orchestration**: Complex generation tasks are handled asynchronously via Celery & Redis.

### 🌿 Git-like Version Control
- **Commits**: Save snapshots of your timeline state. Never lose a creative iteration.
- **Branches**: Create experimental branches (e.g., `director-cut`, `dark-theme`) without affecting the main storyline.
- **Visual Graph**: View your project history as a DAG (Directed Acyclic Graph) using our interactive Git Graph.
- **Forking**: Remix public projects from the community into your own workspace.

### 🖥️ Modern Visual Editor
- **Timeline**: Intuitive drag-and-drop timeline for sequencing clips.
- **Real-time Preview**: Instant playback of your video composition.
- **Asset Management**: Centralized storage for all your generated video assets.

### 🌍 Community & Discovery
- **Discover Feed**: Browse trending projects created by the Vidgit community.
- **User Profiles**: Showcase your portfolio and public projects.
- **Social Interactions**: Like and star your favorite creators' work.

### 💻 CLI Tool
- **Power User Friendly**: Manage your projects directly from the terminal.
- **Commands**: `vidgit login`, `vidgit clone`, `vidgit status`, `vidgit commit`.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy (Async), Pydantic
- **Frontend**: TypeScript, Next.js 14, Tailwind CSS, ReactFlow, Zustand
- **Database**: PostgreSQL 15
- **Queue & Cache**: Redis, RabbitMQ, Celery
- **Storage**: MinIO (S3 Compatible)
- **Infrastructure**: Docker, Nginx

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

Run a production-like stack (Nginx + Frontend + Backend + Worker + DB + Redis + RabbitMQ + MinIO).

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

If downloads are slow (common behind certain networks), you can use a PyPI mirror during build:

```bash
9+
```

Access the application:
- **Frontend**: http://localhost
- **API Docs**: http://localhost/docs
- **API (prefix)**: http://localhost/api/v1

Notes:
- The production compose does not expose Postgres/Redis/MinIO ports to the host by default.

### Option 2: Local Development

#### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (recommended for infra: Postgres/Redis/RabbitMQ/MinIO)

#### Start Infrastructure
```bash
docker-compose up -d
```

#### Backend Setup
```bash
cp .env.example backend/.env
```

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

#### Celery Worker
```bash
cd backend
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Access:
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- MinIO console: http://localhost:9001
- RabbitMQ console: http://localhost:15672

---

## 📂 Project Structure

```
vidgit/
├── backend/            # FastAPI application
│   ├── app/            # Application logic (API, Models, Services)
│   ├── alembic/        # Database migrations
│   └── tests/          # Pytest suites
├── frontend/           # Next.js web application
│   ├── src/app/        # App Router pages
│   ├── src/components/ # Reusable UI components
│   └── tests/          # E2E (Playwright) tests
├── cli/                # Python CLI tool
├── ai_engine/          # AI pipeline logic
├── docs/               # Detailed documentation
├── nginx/              # Nginx configuration
└── plan/               # Development roadmap & stage plans
```

## 📚 Documentation

- [User Guide](docs/user_guide.md): How to use the editor and version control features.
- [Developer Guide](docs/developer_guide.md): Local dev, environment, and architecture overview.
- [Architecture](docs/architecture.md): Components, directories, and core data flows.

## 🧪 Testing

We ensure quality with a comprehensive testing strategy:
- **Backend**: `pytest` for unit and integration tests.
- **Frontend**: `Playwright` for E2E user journey tests.
- **Performance**: `Locust` for load testing critical endpoints.

```bash
# Run backend tests (pytest)
./backend/tests/run_tests.sh

# Run frontend quality gate (lint + typecheck + unit + e2e)
./frontend/tests/run_tests.sh
```

## 🤝 Contributing

Contributions are welcome! Please check the `plan/stage_plan/` directory to see our development roadmap.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
