from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from app.core.cache import cache

from app.models.branch import Branch
from app.models.commit import Commit
from app.models.project import Project

class BranchService:
    @staticmethod
    async def create_branch(
        db: AsyncSession,
        project_id: int,
        name: str,
        from_commit_hash: Optional[str] = None
    ) -> Branch:
        """
        Create a new branch pointing to a specific commit.
        """
        # 1. Check if branch exists
        query = select(Branch).where(Branch.project_id == project_id, Branch.name == name)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Branch already exists")

        # 2. Resolve from_commit_hash
        if from_commit_hash:
            # Verify commit exists
            commit = await db.get(Commit, from_commit_hash)
            if not commit:
                raise HTTPException(status_code=404, detail="Source commit not found")
        else:
            # Default to main branch HEAD? Or None?
            # If from_commit_hash is None, maybe we try to find 'main' branch head?
            # For now, let's require it OR default to None (empty branch? No, branch must point to something usually, unless initial)
            # If initial project, we can create branch with null head.
            pass

        branch = Branch(
            name=name,
            project_id=project_id,
            head_commit_id=from_commit_hash
        )
        db.add(branch)
        await db.commit()
        await db.refresh(branch)
        
        # Invalidate graph cache
        await cache.delete(f"project_graph:{project_id}")
        
        return branch

    @staticmethod
    async def get_project_graph(db: AsyncSession, project_id: int) -> Dict[str, Any]:
        """
        Get the DAG graph of the project (commits and branches).
        """
        # Try cache first
        cache_key = f"project_graph:{project_id}"
        cached_data = await cache.get(cache_key)
        if cached_data:
            return cached_data

        # Fetch all branches
        branches_query = select(Branch).where(Branch.project_id == project_id)
        branches_res = await db.execute(branches_query)
        branches = branches_res.scalars().all()

        # Fetch all commits
        commits_query = select(Commit).where(Commit.project_id == project_id).order_by(Commit.created_at.asc())
        commits_res = await db.execute(commits_query)
        commits = commits_res.scalars().all()

        data = {
            "branches": [
                {"id": b.id, "name": b.name, "head_commit_id": b.head_commit_id} 
                for b in branches
            ],
            "commits": [
                {
                    "id": c.id, 
                    "message": c.message, 
                    "parent_hash": c.parent_hash, 
                    "created_at": c.created_at,
                    "author_id": c.author_id
                } 
                for c in commits
            ]
        }
        
        # Cache the result (convert to JSON-friendly format first)
        json_data = jsonable_encoder(data)
        await cache.set(cache_key, json_data, expire=600) # Cache for 10 mins
        
        return json_data
    
    @staticmethod
    async def get_head_state(db: AsyncSession, project_id: int, branch_name: str = "main") -> Dict[str, Any]:
        """
        Get the state (video_assets) of the HEAD commit of a branch.
        """
        query = select(Branch).where(Branch.project_id == project_id, Branch.name == branch_name)
        result = await db.execute(query)
        branch = result.scalar_one_or_none()
        
        if not branch:
             raise HTTPException(status_code=404, detail="Branch not found")
        
        if not branch.head_commit_id:
            return {"video_assets": {}} # Empty branch

        commit = await db.get(Commit, branch.head_commit_id)
        if not commit:
            raise HTTPException(status_code=404, detail="HEAD commit not found")
            
        return {
            "commit_id": commit.id,
            "message": commit.message,
            "video_assets": commit.video_assets
        }

branch_service = BranchService()
