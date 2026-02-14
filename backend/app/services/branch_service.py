from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from app.core.cache import cache

from app.models.branch import Branch
from app.models.commit import Commit
from app.models.project import Project
from app.models.user import User

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

        branch = Branch(name=name, project_id=project_id, head_commit_id=from_commit_hash)
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
        id_map = {b.internal_id: b.public_id for b in branches}

        # Fetch all commits
        commits_query = select(Commit).where(Commit.project_id == project_id).order_by(Commit.created_at.asc())
        commits_res = await db.execute(commits_query)
        commits = commits_res.scalars().all()
        
        # Build commits map for traversal
        commits_map = {c.id: c for c in commits}
        
        # Fetch authors
        author_ids = {c.author_id for c in commits if c.author_id}
        if author_ids:
            users_query = select(User).where(User.internal_id.in_(author_ids))
            users_res = await db.execute(users_query)
            users = {u.internal_id: u for u in users_res.scalars().all()}
        else:
            users = {}

        # Calculate scores for all commits first
        commit_scores = {}
        for c in commits:
            # Base score 1, bonus for assets
            asset_score = len(c.video_assets.keys()) if c.video_assets else 0
            commit_scores[c.id] = 1 + (asset_score * 0.5)
            
        total_project_score = sum(commit_scores.values()) or 1

        # Calculate branch stats
        branch_stats = {}
        for b in branches:
            stats = {"commit_count": 0, "contributors": {}, "total_score": 0}
            current_hash = b.head_commit_id
            visited = set()
            
            queue = [current_hash] if current_hash else []
            
            while queue:
                h = queue.pop(0)
                if not h or h in visited or h not in commits_map:
                    continue
                visited.add(h)
                
                c = commits_map[h]
                stats["commit_count"] += 1
                
                # Add to branch total score
                score = commit_scores.get(h, 0)
                stats["total_score"] += score
                
                if c.author_id:
                    uid = c.author_id
                    if uid not in stats["contributors"]:
                        u = users.get(uid)
                        stats["contributors"][uid] = {
                            "name": u.full_name if u else f"User {uid}",
                            "count": 0,
                            "score": 0
                        }
                    stats["contributors"][uid]["count"] += 1
                    stats["contributors"][uid]["score"] += score

                if c.parent_hash:
                    queue.append(c.parent_hash)
            
            # Normalize contributors
            branch_total_score = stats["total_score"] or 1
            contributors_list = []
            for uid, cdata in stats["contributors"].items():
                percent = round((cdata["score"] / branch_total_score) * 100, 1)
                contributors_list.append({
                    "name": cdata["name"],
                    "count": cdata["count"],
                    "score": cdata["score"],
                    "percent": percent
                })
            
            # Sort by score desc
            contributors_list.sort(key=lambda x: x["score"], reverse=True)
            
            # Calculate branch contribution to project
            project_percent = round((stats["total_score"] / total_project_score) * 100, 1)
            
            branch_stats[b.public_id] = {
                "contributors": contributors_list,
                "project_percent": project_percent,
                "commit_count": stats["commit_count"]
            }

        data = {
            "branches": [
                {
                    "id": b.public_id,
                    "name": b.name,
                    "head_commit_id": b.head_commit_id,
                    "description": b.description,
                    "tags": b.tags,
                    "parent_branch_id": id_map.get(b.parent_branch_internal_id),
                    "contributors": branch_stats.get(b.public_id, {}).get("contributors", []),
                    "project_percent": branch_stats.get(b.public_id, {}).get("project_percent", 0),
                    "commit_count": branch_stats.get(b.public_id, {}).get("commit_count", 0),
                }
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

    @staticmethod
    def _slugify(text: str) -> str:
        out = []
        for ch in (text or "").strip().lower():
            if ch.isalnum() or ch in {"-", "_"}:
                out.append(ch)
            elif ch in {" ", "/"}:
                out.append("_")
        slug = "".join(out).strip("_")
        return slug or "user"

    @staticmethod
    async def fork_as_branch(
        db: AsyncSession,
        project_internal_id: int,
        creator_internal_id: int,
        source_branch_name: str = "main",
        from_commit_hash: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> Branch:
        res = await db.execute(select(Branch).where(Branch.project_id == project_internal_id, Branch.name == source_branch_name))
        source_branch = res.scalar_one_or_none()
        if not source_branch:
            raise HTTPException(status_code=404, detail="Source branch not found")

        head_commit_id = from_commit_hash or source_branch.head_commit_id
        if from_commit_hash:
            commit = await db.get(Commit, from_commit_hash)
            if not commit:
                raise HTTPException(status_code=404, detail="Source commit not found")

        base_name = (name or "").strip()
        if not base_name:
            nickname = str(creator_internal_id)
            base_name = f"fork/{nickname}"

        candidate = base_name
        suffix = 0
        while True:
            exists = await db.execute(select(Branch.internal_id).where(Branch.project_id == project_internal_id, Branch.name == candidate))
            if not exists.first():
                break
            suffix += 1
            candidate = f"{base_name}_{suffix}"

        branch = Branch(
            name=candidate,
            project_id=project_internal_id,
            head_commit_id=head_commit_id,
            creator_internal_id=creator_internal_id,
            description=description,
            tags=tags,
            parent_branch_internal_id=source_branch.internal_id,
        )
        db.add(branch)
        await db.commit()
        await db.refresh(branch)
        await cache.delete(f"project_graph:{project_internal_id}")
        return branch

branch_service = BranchService()
