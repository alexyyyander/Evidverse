from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.branch import Branch
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    @staticmethod
    async def create_project(db: AsyncSession, project_in: ProjectCreate, owner_id: int) -> Project:
        # 1. Create Project
        db_project = Project(
            name=project_in.name,
            description=project_in.description,
            owner_id=owner_id
        )
        db.add(db_project)
        await db.flush() # Get ID

        # 2. Create Default 'main' Branch
        main_branch = Branch(
            name="main",
            project_id=db_project.id,
            head_commit_id=None
        )
        db.add(main_branch)
        
        await db.commit()
        await db.refresh(db_project)
        return db_project

    @staticmethod
    async def get_user_projects(db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Project]:
        query = select(Project).where(Project.owner_id == user_id).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_project(db: AsyncSession, project_id: int) -> Optional[Project]:
        query = select(Project).where(Project.id == project_id)
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
            owner_id=user_id
        )
        db.add(new_project)
        await db.flush()

        # 4. Create Default Branch (main)
        # Note: We rely on CommitService to update branch HEAD if we use it, 
        # but here we might want to manually set it up to avoid circular dependency or complex logic
        # Let's create branch first.
        new_branch = Branch(
            name="main",
            project_id=new_project.id,
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
                project_id=new_project.id,
                author_id=user_id,
                message=f"Fork from {source_project.name} at {target_commit.id[:7]}",
                video_assets=video_assets,
                branch_name="main",
                parent_hash=None # Start fresh history
            )
        
        await db.commit()
        await db.refresh(new_project)
        return new_project
