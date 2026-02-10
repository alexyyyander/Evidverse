from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, files, generation, anchors, commits

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(generation.router, prefix="/generate", tags=["generation"])
api_router.include_router(anchors.router, prefix="/anchors", tags=["anchors"])
api_router.include_router(commits.router, prefix="/commits", tags=["commits"])
