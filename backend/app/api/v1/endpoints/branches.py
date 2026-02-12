from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.project import Project
from app.models.branch import Branch
from app.services.branch_service import branch_service
from app.services.project_service import ProjectService

router = APIRouter()

class BranchCreate(BaseModel):
    project_id: str
    name: str
    from_commit_hash: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_branch_id: Optional[str] = None

class BranchResponse(BaseModel):
    id: str
    name: str
    project_id: str
    head_commit_id: Optional[str]
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_branch_id: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=BranchResponse)
async def create_branch(
    branch_in: BranchCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new branch.
    """
    # Verify project ownership
    project = await ProjectService.resolve_project(db, branch_in.project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    branch = await branch_service.create_branch(db, project.internal_id, branch_in.name, branch_in.from_commit_hash)
    branch.creator_internal_id = current_user.internal_id
    branch.description = branch_in.description
    branch.tags = branch_in.tags
    parent_public_id: Optional[str] = None
    if branch_in.parent_branch_id:
        res = await db.execute(
            select(Branch).where(Branch.project_id == project.internal_id, Branch.public_id == branch_in.parent_branch_id)
        )
        parent = res.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent branch not found")
        branch.parent_branch_internal_id = parent.internal_id
        parent_public_id = parent.public_id
    await db.commit()
    await db.refresh(branch)
    return BranchResponse.model_validate(
        {
            "id": branch.public_id,
            "name": branch.name,
            "project_id": project.public_id,
            "head_commit_id": branch.head_commit_id,
            "description": branch.description,
            "tags": branch.tags,
            "parent_branch_id": parent_public_id,
        }
    )
