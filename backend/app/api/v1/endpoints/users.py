from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.project import ProjectFeedItem as ProjectSchema
from app.services.feed_service import FeedService

router = APIRouter()

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.get("/{user_id}", response_model=UserSchema)
async def read_user(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get public user info.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}/projects", response_model=List[ProjectSchema])
async def read_user_projects(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get user's public projects.
    """
    # Check if user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="User not found")

    current_user_id = current_user.id if current_user else None
    return await FeedService.get_user_public_projects(db, user_id, current_user_id, skip, limit)
