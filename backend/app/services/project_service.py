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
