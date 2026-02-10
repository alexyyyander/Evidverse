# Vidgit

Vidgit is an AI video generation platform with Git-like version control.

## Project Structure

- `backend/`: FastAPI backend service
- `frontend/`: Next.js web application with Visual Editor
- `ai_engine/`: AI pipelines and character consistency algorithms
- `cli/`: Command-line interface tool
- `infrastructure/`: Deployment configurations

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
