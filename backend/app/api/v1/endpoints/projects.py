from typing import Any, List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.project import Project, ProjectCreate, ProjectUpdate, ProjectFork, ProjectFeedItem
from app.schemas.branch import Branch
from app.services.project_service import ProjectService
from app.services.branch_service import branch_service
from app.services.feed_service import FeedService

router = APIRouter()

@router.get("/feed", response_model=List[ProjectFeedItem])
async def read_public_feed(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional), # Allow anonymous
) -> Any:
    """
    Get public project feed.
    """
    user_id = current_user.id if current_user else None
    return await FeedService.get_public_feed(db, user_id, skip, limit)

@router.post("/", response_model=Project)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new project.
    """
    return await ProjectService.create_project(db, project_in, current_user.id)

@router.get("/", response_model=List[Project])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve current user's projects.
    """
    return await ProjectService.get_user_projects(db, current_user.id, skip, limit)

@router.get("/{project_id}", response_model=Project)
async def read_project(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project by ID.
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return project

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update project.
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await ProjectService.update_project(db, project, project_in)

@router.delete("/{project_id}", response_model=Project)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete project.
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await ProjectService.delete_project(db, project)

@router.get("/{project_id}/branches", response_model=List[Branch])
async def read_project_branches(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all branches of a project.
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await ProjectService.get_project_branches(db, project_id)

@router.get("/{project_id}/graph", response_model=Dict[str, Any])
async def read_project_graph(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project commit graph.
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await branch_service.get_project_graph(db, project_id)

@router.get("/{project_id}/head", response_model=Dict[str, Any])
async def read_project_head(
    project_id: int,
    branch_name: str = "main",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get HEAD state of a branch (default main).
    """
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await branch_service.get_head_state(db, project_id, branch_name)

@router.post("/{project_id}/like", response_model=bool)
async def like_project(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Toggle like for a project. Returns True if liked, False if unliked.
    """
    return await FeedService.toggle_like(db, project_id, current_user.id)

@router.post("/{project_id}/fork", response_model=Project)
async def fork_project(
    project_id: int,
    fork_in: ProjectFork,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Fork a project.
    """
    try:
        return await ProjectService.fork_project(db, project_id, current_user.id, fork_in.commit_hash)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
