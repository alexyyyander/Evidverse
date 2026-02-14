from typing import Any, List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.branch import Branch
from app.schemas.project import Project, ProjectCreate, ProjectUpdate, ProjectFork, ProjectFeedItem, ProjectDeleteConfirm, ProjectExportPayload
from app.schemas.branch import Branch as BranchSchema
from app.services.project_service import ProjectService
from app.services.branch_service import branch_service
from app.services.feed_service import FeedService
from pydantic import BaseModel
from app.models.commit import Commit

router = APIRouter()

@router.get("/feed", response_model=List[ProjectFeedItem])
async def read_public_feed(
    skip: int = 0,
    limit: int = 20,
    query: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = "new",
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional), # Allow anonymous
) -> Any:
    """
    Get public project feed.
    """
    user_id = current_user.internal_id if current_user else None
    return await FeedService.get_public_feed(db, user_id, skip, limit, query, tag, sort)

@router.get("/public/{project_id}", response_model=ProjectFeedItem)
async def read_public_project(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
) -> Any:
    user_id = current_user.internal_id if current_user else None
    project = await FeedService.get_public_project(db, project_id, user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("", response_model=Project)
@router.post("/", response_model=Project)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new project.
    """
    return await ProjectService.create_project(db, project_in, current_user.internal_id)

@router.get("", response_model=List[Project])
@router.get("/", response_model=List[Project])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve current user's projects.
    Includes both owned projects and projects where the user has created branches (forked).
    """
    return await ProjectService.get_involved_projects(db, current_user.internal_id, skip, limit)

@router.get("/{project_id}", response_model=Project)
async def read_project(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project by ID.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return project

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update project.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await ProjectService.update_project(db, project, project_in)

@router.post("/{project_id}/delete", response_model=Project)
@router.delete("/{project_id}", response_model=Project)
async def delete_project(
    project_id: str,
    confirm: ProjectDeleteConfirm,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete project.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    expected_project_id = project.public_id
    if confirm.confirm_project_id.strip() != expected_project_id:
        raise HTTPException(status_code=400, detail="Project id confirmation does not match")

    expected_nickname = (current_user.full_name or current_user.email.split("@")[0]).strip()
    if confirm.confirm_nickname.strip().lower() != expected_nickname.lower():
        raise HTTPException(status_code=400, detail="Nickname confirmation does not match")
    
    return await ProjectService.delete_project(db, project)


@router.get("/{project_id}/export", response_model=ProjectExportPayload)
async def export_project(
    project_id: str,
    branch_name: str = "main",
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    user_id = current_user.internal_id if current_user else None
    can_read = project.is_public or (user_id is not None and project.owner_internal_id == user_id)
    if not can_read:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    res = await db.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == branch_name))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    head_commit = None
    if branch.head_commit_id:
        commit = await db.get(Commit, branch.head_commit_id)
        if commit:
            head_commit = {"message": commit.message, "video_assets": commit.video_assets}

    return {
        "source": {"cloud_project_id": project.public_id, "cloud_branch_name": branch.name, "cloud_origin": None},
        "project": {"name": project.name, "description": project.description, "tags": project.tags},
        "branch": {"name": branch.name, "description": branch.description, "tags": branch.tags, "workspace_data": branch.workspace_data or {}},
        "head_commit": head_commit,
    }


@router.post("/import", response_model=Project)
async def import_project(
    payload: ProjectExportPayload,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_in = ProjectCreate(
        name=payload.project.name,
        description=payload.project.description,
        tags=payload.project.tags,
        is_public=False,
    )
    project = await ProjectService.create_project(db, project_in, current_user.internal_id)

    res = await db.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == "main"))
    main_branch = res.scalar_one_or_none()
    if main_branch:
        main_branch.description = payload.branch.description
        main_branch.tags = payload.branch.tags
        main_branch.workspace_data = payload.branch.workspace_data or {}
        db.add(main_branch)
        await db.commit()

    if payload.head_commit and isinstance(payload.head_commit.video_assets, dict):
        from app.services.commit_service import CommitService

        await CommitService.create_commit(
            db=db,
            project_id=project.internal_id,
            author_id=current_user.internal_id,
            message=payload.head_commit.message or f"Imported from cloud {payload.source.cloud_project_id}",
            video_assets=payload.head_commit.video_assets or {},
            branch_name="main",
            parent_hash=None,
        )

    return project

@router.get("/{project_id}/branches", response_model=List[BranchSchema])
async def read_project_branches(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all branches of a project.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.is_public and project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    branches = await ProjectService.get_project_branches(db, project.internal_id)
    id_map = {b.internal_id: b.public_id for b in branches}
    return [
        {
            "id": b.public_id,
            "name": b.name,
            "project_id": project.public_id,
            "head_commit_id": b.head_commit_id,
            "description": b.description,
            "tags": b.tags,
            "parent_branch_id": id_map.get(b.parent_branch_internal_id),
        }
        for b in branches
    ]

@router.get("/{project_id}/graph", response_model=Dict[str, Any])
async def read_project_graph(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project commit graph.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await branch_service.get_project_graph(db, project.internal_id)

@router.get("/{project_id}/head", response_model=Dict[str, Any])
async def read_project_head(
    project_id: str,
    branch_name: str = "main",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get HEAD state of a branch (default main).
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await branch_service.get_head_state(db, project.internal_id, branch_name)


@router.get("/{project_id}/workspace", response_model=Dict[str, Any])
async def read_project_workspace(
    project_id: str,
    branch_name: str = "main",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    res = await db.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == branch_name))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    can_read = project.is_public or project.owner_internal_id == current_user.internal_id or branch.creator_internal_id == current_user.internal_id
    if not can_read:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return branch.workspace_data or {}


@router.put("/{project_id}/workspace", response_model=Dict[str, Any])
async def update_project_workspace(
    project_id: str,
    payload: Dict[str, Any],
    branch_name: str = "main",
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    res = await db.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == branch_name))
    branch = res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    can_write = project.owner_internal_id == current_user.internal_id or branch.creator_internal_id == current_user.internal_id
    if not can_write:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    branch.workspace_data = payload
    await db.commit()
    await db.refresh(branch)
    return branch.workspace_data or {}

@router.post("/{project_id}/like", response_model=bool)
async def like_project(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Toggle like for a project. Returns True if liked, False if unliked.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.is_public and project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return await FeedService.toggle_like(db, project.internal_id, current_user.internal_id)

@router.post("/{project_id}/fork", response_model=Project)
async def fork_project(
    project_id: str,
    fork_in: ProjectFork,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Fork a project.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.is_public and project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    try:
        return await ProjectService.fork_project(db, project.internal_id, current_user.internal_id, fork_in.commit_hash)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class ForkBranchCreate(BaseModel):
    source_branch_name: str = "main"
    from_commit_hash: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/{project_id}/fork-branch", response_model=BranchSchema)
async def fork_project_as_branch(
    project_id: str,
    body: ForkBranchCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.is_public and project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    res = await db.execute(select(Branch).where(Branch.project_id == project.internal_id, Branch.name == (body.source_branch_name or "main")))
    source_branch = res.scalar_one_or_none()
    if not source_branch:
        raise HTTPException(status_code=404, detail="Source branch not found")

    nickname = (current_user.full_name or current_user.email.split("@")[0]).strip()
    nickname = branch_service._slugify(nickname)
    name = body.name.strip() if isinstance(body.name, str) else ""
    if not name:
        name = f"fork/{nickname}"

    branch = await branch_service.fork_as_branch(
        db=db,
        project_internal_id=project.internal_id,
        creator_internal_id=current_user.internal_id,
        source_branch_name=body.source_branch_name or "main",
        from_commit_hash=body.from_commit_hash,
        name=name,
        description=body.description,
        tags=body.tags,
    )
    return {
        "id": branch.public_id,
        "name": branch.name,
        "project_id": project.public_id,
        "head_commit_id": branch.head_commit_id,
        "description": branch.description,
        "tags": branch.tags,
        "parent_branch_id": source_branch.public_id,
    }
