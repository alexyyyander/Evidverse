from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, files, generation, anchors, commits, branches, tasks, publish, vn, clips, merge_requests, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(generation.router, prefix="/generate", tags=["generation"])
api_router.include_router(anchors.router, prefix="/anchors", tags=["anchors"])
api_router.include_router(commits.router, prefix="/commits", tags=["commits"])
api_router.include_router(branches.router, prefix="/branches", tags=["branches"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(publish.router, prefix="/publish", tags=["publish"])
api_router.include_router(vn.router, prefix="/vn", tags=["vn"])
api_router.include_router(clips.router, prefix="/clips", tags=["clips"])
api_router.include_router(merge_requests.router, tags=["merge_requests"])
