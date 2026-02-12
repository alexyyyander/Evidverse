from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.api import deps
from app.models.user import User
from app.schemas.user import User as UserSchema, UserPublic
from app.schemas.project import ProjectFeedItem as ProjectSchema
from app.services.feed_service import FeedService

router = APIRouter()

@router.get("/search", response_model=List[UserPublic])
async def search_users(
    query: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    text = query.strip()
    if not text:
        return []
    q = select(User)
    conditions = [User.email.ilike(f"%{text}%")]
    if hasattr(User, "full_name"):
        conditions.append(User.full_name.ilike(f"%{text}%"))
    if text.isdigit():
        conditions.append(User.internal_id == int(text))
    if len(text) >= 8:
        conditions.append(User.public_id.ilike(f"%{text}%"))
    q = q.where(or_(*conditions)).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()

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
    user_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get public user info.
    """
    text = user_id.strip()
    if text.isdigit():
        result = await db.execute(select(User).where(User.internal_id == int(text)))
    else:
        result = await db.execute(select(User).where(User.public_id == text))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}/projects", response_model=List[ProjectSchema])
async def read_user_projects(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
) -> Any:
    """
    Get user's public projects.
    """
    # Check if user exists
    text = user_id.strip()
    if text.isdigit():
        result = await db.execute(select(User).where(User.internal_id == int(text)))
    else:
        result = await db.execute(select(User).where(User.public_id == text))
    target_user = result.scalar_one_or_none()
    if not target_user:
         raise HTTPException(status_code=404, detail="User not found")

    current_user_id = current_user.internal_id if current_user else None
    return await FeedService.get_user_public_projects(db, target_user.internal_id, current_user_id, skip, limit)
