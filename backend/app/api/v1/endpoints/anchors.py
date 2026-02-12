from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.anchor import CharacterAnchor
from app.models.project import Project
from app.services.project_service import ProjectService

router = APIRouter()

class AnchorCreate(BaseModel):
    name: str
    project_id: str
    reference_image_url: str

class AnchorResponse(BaseModel):
    id: int
    name: str
    project_id: str
    reference_image_url: str

    class Config:
        from_attributes = True

@router.post("/", response_model=AnchorResponse)
async def create_anchor(
    anchor_in: AnchorCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a character anchor for a project.
    """
    # Verify project ownership
    project = await ProjectService.resolve_project(db, anchor_in.project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db_anchor = CharacterAnchor(
        name=anchor_in.name,
        project_id=project.internal_id,
        reference_image_url=anchor_in.reference_image_url
    )
    db.add(db_anchor)
    await db.commit()
    await db.refresh(db_anchor)
    return AnchorResponse.model_validate(
        {"id": db_anchor.id, "name": db_anchor.name, "project_id": project.public_id, "reference_image_url": db_anchor.reference_image_url}
    )

@router.get("/project/{project_id}", response_model=List[AnchorResponse])
async def read_project_anchors(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all anchors for a project.
    """
    # Verify project ownership
    project = await ProjectService.resolve_project(db, project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    query = select(CharacterAnchor).where(CharacterAnchor.project_id == project.internal_id)
    result = await db.execute(query)
    anchors = result.scalars().all()
    return [
        AnchorResponse.model_validate(
            {"id": a.id, "name": a.name, "project_id": project.public_id, "reference_image_url": a.reference_image_url}
        )
        for a in anchors
    ]
