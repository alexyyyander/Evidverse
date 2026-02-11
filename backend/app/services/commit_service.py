import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
from app.core.cache import cache

from app.models.commit import Commit
from app.models.branch import Branch
from app.models.project import Project

class CommitService:
    @staticmethod
    def calculate_hash(message: str, parent_hash: Optional[str], video_assets: Dict[str, Any], timestamp: str) -> str:
        """
        Calculate SHA-1 hash for the commit.
        """
        content = {
            "message": message,
            "parent_hash": parent_hash,
            "video_assets": video_assets,
            "timestamp": timestamp
        }
        # Sort keys for consistent hashing
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.sha1(content_str.encode("utf-8")).hexdigest()

    @staticmethod
    async def create_commit(
        db: AsyncSession,
        project_id: int,
        author_id: int,
        message: str,
        video_assets: Dict[str, Any],
        branch_name: str = "main",
        parent_hash: Optional[str] = None
    ) -> Commit:
        """
        Create a new commit and update the branch HEAD.
        """
        # 1. Verify Project
        project = await db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Get Branch
        query = select(Branch).where(Branch.project_id == project_id, Branch.name == branch_name)
        result = await db.execute(query)
        branch = result.scalar_one_or_none()
        
        if not branch:
            # Auto-create branch if main and not exists? Or fail?
            # For now, let's assume branch exists or auto-create 'main' on first commit if strictly needed,
            # but usually branches are created with project.
            if branch_name == "main":
                 # Fallback: create main branch if missing (e.g. legacy projects)
                 branch = Branch(name="main", project_id=project_id)
                 db.add(branch)
                 await db.flush() # get ID
            else:
                raise HTTPException(status_code=404, detail=f"Branch {branch_name} not found")

        # 3. Determine Parent Hash
        # If parent_hash is not provided, use branch.head_commit_id
        if not parent_hash:
            parent_hash = branch.head_commit_id
        
        # 4. Create Commit
        timestamp = datetime.utcnow().isoformat()
        commit_id = CommitService.calculate_hash(message, parent_hash, video_assets, timestamp)
        
        # Check collision (unlikely but good practice)
        existing_commit = await db.get(Commit, commit_id)
        if existing_commit:
             # If exact same content, just return existing? Or error?
             # Git allows empty commits but hash changes with timestamp. 
             # Our timestamp is generated here, so collision means exact same millisecond.
             pass

        commit = Commit(
            id=commit_id,
            project_id=project_id,
            author_id=author_id,
            message=message,
            parent_hash=parent_hash,
            video_assets=video_assets,
            # created_at is auto-handled by DB default, but for hashing consistency we might want to set it explicitly
            # Let's rely on DB for now, hash uses the generated timestamp string.
        )
        db.add(commit)
        
        # 5. Update Branch HEAD
        # We need to update the branch to point to this new commit
        branch.head_commit_id = commit_id
        db.add(branch) # Update branch
        
        await db.commit()
        await db.refresh(commit)
        
        # Invalidate graph cache
        await cache.delete(f"project_graph:{project_id}")
        
        return commit

commit_service = CommitService()
