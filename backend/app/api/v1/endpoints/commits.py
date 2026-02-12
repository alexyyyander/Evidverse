from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.services.commit_service import commit_service
from app.services.project_service import ProjectService

router = APIRouter()

class CommitCreate(BaseModel):
    project_id: str
    message: str
    video_assets: Dict[str, Any]
    branch_name: str = "main"
    parent_hash: Optional[str] = None

class CommitResponse(BaseModel):
    id: str
    project_id: str
    message: str
    parent_hash: Optional[str]
    video_assets: Dict[str, Any]
    created_at: Any

    class Config:
        from_attributes = True

@router.post("/", response_model=CommitResponse)
async def create_commit(
    commit_in: CommitCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new commit.
    """
    # Service will handle project validation
    project = await ProjectService.resolve_project(db, commit_in.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    commit = await commit_service.create_commit(
        db=db,
        project_id=project.internal_id,
        author_id=current_user.internal_id,
        message=commit_in.message,
        video_assets=commit_in.video_assets,
        branch_name=commit_in.branch_name,
        parent_hash=commit_in.parent_hash
    )
    return CommitResponse.model_validate(
        {
            "id": commit.id,
            "project_id": project.public_id,
            "message": commit.message,
            "parent_hash": commit.parent_hash,
            "video_assets": commit.video_assets,
            "created_at": commit.created_at,
        }
    )
