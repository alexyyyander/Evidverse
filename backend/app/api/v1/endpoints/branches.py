from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.project import Project
from app.services.branch_service import branch_service

router = APIRouter()

class BranchCreate(BaseModel):
    project_id: int
    name: str
    from_commit_hash: Optional[str] = None

class BranchResponse(BaseModel):
    id: int
    name: str
    project_id: int
    head_commit_id: Optional[str]

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
    query = select(Project).where(Project.id == branch_in.project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return await branch_service.create_branch(
        db, 
        branch_in.project_id, 
        branch_in.name, 
        branch_in.from_commit_hash
    )
