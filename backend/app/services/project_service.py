from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.branch import Branch
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    @staticmethod
    async def get_project_by_public_id(db: AsyncSession, public_id: str) -> Optional[Project]:
        query = select(Project).where(Project.public_id == public_id).options(selectinload(Project.owner), selectinload(Project.parent_project))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_involved_projects(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Project]:
        """
        查询用户参与的项目：
        1. 用户是项目的所有者
        2. 用户在项目中创建了分支 (Fork-as-Branch)
        """
        query = (
            select(Project)
            .join(Branch, Branch.project_id == Project.internal_id) # 关联分支表
            .where(
                or_(
                    Project.owner_internal_id == user_id,   # 条件1: 我是项目拥有者
                    Branch.creator_internal_id == user_id   # 条件2: 我是某分支的创建者
                )
            )
            .group_by(Project.internal_id) # 去重，防止因为有多个分支导致项目重复出现
            .options(selectinload(Project.owner), selectinload(Project.parent_project))
            .offset(skip)
            .limit(limit)
        )
        
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def resolve_project(db: AsyncSession, project_id: str) -> Optional[Project]:
        text = (project_id or "").strip()
        if not text:
            return None
        if text.isdigit():
            return await ProjectService.get_project(db, int(text))
        return await ProjectService.get_project_by_public_id(db, text)

    @staticmethod
    async def create_project(db: AsyncSession, project_in: ProjectCreate, owner_id: int) -> Project:
        # 1. Create Project
        db_project = Project(
            name=project_in.name,
            description=project_in.description,
            tags=project_in.tags,
            owner_internal_id=owner_id,
            is_public=project_in.is_public,
        )
        db.add(db_project)
        await db.flush() # Get ID

        # 2. Create Default 'main' Branch
        main_branch = Branch(
            name="main",
            project_id=db_project.internal_id,
            head_commit_id=None,
            creator_internal_id=owner_id,
        )
        db.add(main_branch)
        
        await db.commit()
        await db.refresh(db_project)
        await db.refresh(db_project, attribute_names=["owner", "parent_project"])
        return db_project

    @staticmethod
    async def get_user_projects(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Project]:
        query = (
            select(Project)
            .where(Project.owner_internal_id == user_id)
            .options(selectinload(Project.owner), selectinload(Project.parent_project))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_project(db: AsyncSession, project_id: int) -> Optional[Project]:
        query = select(Project).where(Project.internal_id == project_id).options(selectinload(Project.owner), selectinload(Project.parent_project))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_project(db: AsyncSession, db_project: Project, project_in: ProjectUpdate) -> Project:
        if project_in.name is not None:
            db_project.name = project_in.name
        if project_in.description is not None:
            db_project.description = project_in.description
        if project_in.workspace_data is not None:
            db_project.workspace_data = project_in.workspace_data
        if project_in.tags is not None:
            db_project.tags = project_in.tags
        if project_in.is_public is not None:
            db_project.is_public = project_in.is_public
        
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project

    @staticmethod
    async def delete_project(db: AsyncSession, db_project: Project) -> Project:
        await db.delete(db_project)
        await db.commit()
        return db_project
        
    @staticmethod
    async def get_project_branches(db: AsyncSession, project_id: int) -> List[Branch]:
        query = select(Branch).where(Branch.project_id == project_id)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def fork_project(db: AsyncSession, source_project_id: int, user_id: int, commit_hash: Optional[str] = None) -> Project:
        # 1. Get Source Project
        source_project = await ProjectService.get_project(db, source_project_id)
        if not source_project:
            raise ValueError("Source project not found")

        # 2. Determine Target Commit (State to fork from)
        from app.models.commit import Commit
        from app.models.branch import Branch
        
        target_commit = None
        if commit_hash:
            target_commit = await db.get(Commit, commit_hash)
        else:
            # Get HEAD of main branch
            query = select(Branch).where(Branch.project_id == source_project_id, Branch.name == "main")
            result = await db.execute(query)
            main_branch = result.scalar_one_or_none()
            if main_branch and main_branch.head_commit_id:
                target_commit = await db.get(Commit, main_branch.head_commit_id)
        
        if not target_commit:
             # If source project has no commits, just fork empty project
             video_assets = {}
        else:
             video_assets = target_commit.video_assets

        # 3. Create New Project
        fork_name = f"Fork of {source_project.name}"
        new_project = Project(
            name=fork_name,
            description=f"Forked from project {source_project.id}",
            owner_internal_id=user_id,
            parent_project_internal_id=source_project.internal_id,
            tags=source_project.tags,
            is_public=False,
        )
        db.add(new_project)
        await db.flush()

        # 4. Create Default Branch (main)
        # Note: We rely on CommitService to update branch HEAD if we use it, 
        # but here we might want to manually set it up to avoid circular dependency or complex logic
        # Let's create branch first.
        new_branch = Branch(
            name="main",
            project_id=new_project.internal_id,
            head_commit_id=None
        )
        db.add(new_branch)
        await db.flush()

        # 5. Create Initial Commit with state from source
        if target_commit:
            from app.services.commit_service import CommitService
            # We use CommitService to create the commit properly
            await CommitService.create_commit(
                db=db,
                project_id=new_project.internal_id,
                author_id=user_id,
                message=f"Fork from {source_project.name} at {target_commit.id[:7]}",
                video_assets=video_assets,
                branch_name="main",
                parent_hash=None # Start fresh history
            )
        
        await db.commit()
        return await ProjectService.get_project(db, new_project.internal_id)
