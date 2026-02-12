from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.like import Like
from app.schemas.project import ProjectFeedItem as ProjectSchema

class FeedService:
    @staticmethod
    async def get_public_feed(
        db: AsyncSession, 
        current_user_id: Optional[int], 
        skip: int = 0, 
        limit: int = 20
    ) -> List[ProjectSchema]:
        """
        Get public projects with like info.
        """
        # Base query for public projects
        query = select(Project).where(Project.is_public == True)
        query = query.order_by(desc(Project.created_at)).offset(skip).limit(limit)
        
        # Eager load owner for display
        query = query.options(selectinload(Project.owner))
        
        result = await db.execute(query)
        projects = result.scalars().all()
        
        # Enrich with like info
        # This is N+1 query, but for feed (limit 20) it's acceptable for MVP.
        # Optimization: Use group_by and join in the main query.
        enriched_projects = []
        for p in projects:
            # Count likes
            count_query = select(func.count(Like.id)).where(Like.project_id == p.id)
            likes_count = (await db.execute(count_query)).scalar() or 0
            
            # Check is_liked
            is_liked = False
            if current_user_id:
                liked_query = select(Like).where(
                    and_(Like.project_id == p.id, Like.user_id == current_user_id)
                )
                is_liked = (await db.execute(liked_query)).scalar_one_or_none() is not None
            
            # Manually construct schema
            p_schema = ProjectSchema.model_validate(p)
            p_schema.likes_count = likes_count
            p_schema.is_liked = is_liked
            enriched_projects.append(p_schema)
            
        return enriched_projects

    @staticmethod
    async def toggle_like(db: AsyncSession, project_id: int, user_id: int) -> bool:
        """
        Toggle like. Returns True if liked, False if unliked.
        """
        query = select(Like).where(
            and_(Like.project_id == project_id, Like.user_id == user_id)
        )
        existing_like = (await db.execute(query)).scalar_one_or_none()
        
        if existing_like:
            await db.delete(existing_like)
            await db.commit()
            return False
        else:
            new_like = Like(project_id=project_id, user_id=user_id)
            db.add(new_like)
            await db.commit()
            return True
            
    @staticmethod
    async def get_user_public_projects(
        db: AsyncSession,
        target_user_id: int,
        current_user_id: Optional[int],
        skip: int = 0,
        limit: int = 20
    ) -> List[ProjectSchema]:
        """
        Get public projects of a specific user.
        If current_user_id == target_user_id, maybe show private ones too? 
        For now, let's stick to public profile view.
        """
        query = select(Project).where(
            and_(Project.owner_id == target_user_id, Project.is_public == True)
        )
        query = query.order_by(desc(Project.created_at)).offset(skip).limit(limit)
        query = query.options(selectinload(Project.owner))
        
        result = await db.execute(query)
        projects = result.scalars().all()
        
        enriched_projects = []
        for p in projects:
            count_query = select(func.count(Like.id)).where(Like.project_id == p.id)
            likes_count = (await db.execute(count_query)).scalar() or 0
            
            is_liked = False
            if current_user_id:
                liked_query = select(Like).where(
                    and_(Like.project_id == p.id, Like.user_id == current_user_id)
                )
                is_liked = (await db.execute(liked_query)).scalar_one_or_none() is not None
            
            p_schema = ProjectSchema.model_validate(p)
            p_schema.likes_count = likes_count
            p_schema.is_liked = is_liked
            enriched_projects.append(p_schema)
            
        return enriched_projects
