# AGENTS.md - Agent Coding Guidelines for Evidverse

This file provides guidelines and commands for agentic coding agents working in this repository.

---

## 1. Build, Lint, and Test Commands

### Frontend (Next.js)

```bash
# Development
cd frontend && npm run dev              # Start dev server on localhost:3000
cd frontend && npm run build            # Production build
cd frontend && npm run start            # Start production server

# Linting & Type Checking
cd frontend && npm run lint             # ESLint check
cd frontend && npm run typecheck        # TypeScript type check (noEmit)
cd frontend && npm run typecheck:next   # Next.js build without lint

# Testing
cd frontend && npm run test:unit        # Vitest unit tests
cd frontend && npm run test:e2e          # Playwright E2E tests
cd frontend && npm run test              # CI=1 playwright test (headless)

# Run a single unit test
cd frontend && npx vitest run src/path/to/test.test.ts
cd frontend && npx vitest run --grep "test name pattern"

# Combined checks
cd frontend && npm run check             # lint + typecheck + test:unit
cd frontend && npm run check:ci          # Full CI check (includes E2E)

# Formatting
cd frontend && npm run format            # Prettier write
cd frontend && npm run format:check     # Prettier check
```

### Backend (FastAPI)

```bash
# Development
cd backend && uvicorn app.main:app --reload --port 8000

# Celery Worker (for background tasks)
cd backend && celery -A app.core.celery_app worker --loglevel=info

# Run all tests
cd backend && python -m pytest -v
cd backend && bash tests/run_tests.sh

# Run a single test
cd backend && python -m pytest tests/test_filename.py::test_function_name -v
cd backend && python -m pytest tests/test_filename.py -k "test_pattern" -v

# Run tests with coverage
cd backend && python -m pytest --cov=app --cov-report=html

# Database migrations
cd backend && alembic revision --autogenerate -m "migration name"
cd backend && alembic upgrade head
cd backend && alembic downgrade -1
```

### Infrastructure

```bash
# Docker development environment
docker-compose up -d

# Production-like Docker
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 2. Code Style Guidelines

### Python (Backend)

#### Imports (PEP 8)
```python
# Standard library
from typing import Any, List, Optional
from pathlib import Path

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# Local application
from app.api import deps
from app.models.user import User
from app.schemas.project import ProjectCreate
from app.services.project_service import ProjectService
```

#### Type Hints
- Always use type hints for function parameters and return types
- Use `Optional[T]` instead of `T | None` for compatibility
- Prefer explicit return types: `async def foo() -> List[Project]:`

#### Async/Await
- Use async/await for all database operations
- Always `await` database commits and queries
- Use `AsyncSession` from `sqlalchemy.ext.asyncio`

#### Error Handling
- Use `HTTPException` from FastAPI for HTTP errors
- Include meaningful error messages and detail
- Use appropriate HTTP status codes (400, 404, 500, etc.)

#### Naming Conventions
- Classes: `PascalCase` (e.g., `ProjectService`)
- Functions/methods: `snake_case` (e.g., `create_project`)
- Constants: `UPPER_SNAKE_CASE`
- Database models: `PascalCase` matching table name
- Pydantic schemas: `PascalCase` with suffix (e.g., `ProjectCreate`)

#### File Organization
- API endpoints: `backend/app/api/v1/endpoints/`
- Service layer: `backend/app/services/`
- Models: `backend/app/models/`
- Schemas: `backend/app/schemas/`
- Workers: `backend/app/workers/`

---

### TypeScript/JavaScript (Frontend)

#### Path Aliases
- `@/*` maps to `src/*` (configured in tsconfig.json)
- Use absolute imports: `import Button from "@/components/ui/button"`

#### Client vs Server Components
```typescript
// Client component - for interactive UI
"use client";

import { useState } from "react";

// Server component - default, for data fetching
import { getData } from "@/lib/api";
```

#### Component Structure
```typescript
// Prefer this pattern for exports
export default function ComponentName() {
  // component logic
}

// Named exports for utilities/hooks
export function helperFunction() { }
```

#### Naming Conventions
- Components: `PascalCase` (e.g., `GitGraph.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useAuthToken`)
- Utilities: `camelCase` (e.g., `cn.ts`)
- Types/Interfaces: `PascalCase` (e.g., `Project`)

#### State Management
- Server state: React Query (`@tanstack/react-query`)
- Client state: Zustand (`@/store/`)
- Avoid useState for server-fetched data

#### Tailwind CSS
- Use existing design tokens from `tailwind.config.ts`
- Prefer utility classes over custom CSS
- Use `cn()` utility for conditional classes

---

### Prettier Configuration

```json
{
  "printWidth": 100,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

### ESLint Configuration

- Extends: `next/core-web-vitals`
- Restricts Radix UI imports to `src/components/ui/` only
- Override exists for UI component files

---

## 3. Project-Specific Guidelines

### Before Starting Development

1. **Always check** `plan/current_stage&FAQ.md` for current stage and priorities
2. Read the corresponding stage plan (e.g., `plan/stage_plan_dev_v2/stage_*.md`)
3. Understand the goals and functional requirements

### Git Workflow

- Commit messages should reference the stage: `feat(stage01): implement user model`
- Commit after each stage test is passed
- Avoid committing secrets, `.env` files, or large binary data
- Use `.gitignore` to exclude unnecessary files

### Testing Requirements

- **Backend**: Use pytest - all tests must pass before commit
- **Frontend**: Use Vitest for unit tests, Playwright for E2E
- Run full test suite before submitting: `npm run check` (frontend) + `pytest` (backend)

### API Design

- Follow RESTful conventions
- Use Pydantic schemas for request/response validation
- Document endpoints with docstrings
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)

### Database

- Use Alembic for migrations
- Always generate migration after model changes
- Use async SQLAlchemy models with proper relationships

---

## 4. Technology Stack Reference

| Layer | Technology |
|-------|------------|
| Backend Framework | FastAPI |
| Database | PostgreSQL + SQLAlchemy (async) |
| Task Queue | Celery + RabbitMQ |
| Cache | Redis |
| Storage | MinIO/S3 |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Testing | Vitest + Playwright |
| Linting | ESLint |
| Formatting | Prettier |

---

## 5. Common Tasks Reference

### Create a new API endpoint
1. Add route in `backend/app/api/v1/endpoints/`
2. Add service method in `backend/app/services/`
3. Add Pydantic schemas in `backend/app/schemas/`
4. Add tests in `backend/tests/`

### Create a new frontend component
1. Add to `frontend/src/components/` (use existing patterns)
2. Add UI components to `frontend/src/components/ui/`
3. Use `@/lib/api/` for API calls
4. Add tests in `frontend/src/__tests__/`

### Database migration
1. Modify model in `backend/app/models/`
2. Run: `alembic revision --autogenerate -m "description"`
3. Review migration in `alembic/versions/`
4. Run: `alembic upgrade head`

---

*Last updated: 2026-02-16*
