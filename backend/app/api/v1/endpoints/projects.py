import json
from typing import Any, List, Dict, Optional, Set
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.branch import Branch
from app.models.project import Project as ProjectModel
from app.models.fork_request import ForkRequest
from app.schemas.project import Project, ProjectCreate, ProjectUpdate, ProjectFork, ProjectFeedItem, ProjectDeleteConfirm, ProjectExportPayload
from app.schemas.branch import Branch as BranchSchema
from app.services.project_service import ProjectService
from app.services.branch_service import branch_service
from app.services.feed_service import FeedService
from pydantic import BaseModel
from app.models.commit import Commit

router = APIRouter()


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _extract_story_workflow(payload: Dict[str, Any] | None) -> Optional[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return None
    editor_state = payload.get("editorState")
    if not isinstance(editor_state, dict):
        return None
    workflow = editor_state.get("storyWorkflow")
    if not isinstance(workflow, dict):
        return None
    return workflow


def _coerce_non_negative_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float) and value.is_integer():
        iv = int(value)
        return iv if iv >= 0 else None
    return None


def _extract_lock_boundary_order(workflow: Dict[str, Any] | None) -> Optional[int]:
    if not isinstance(workflow, dict):
        return None
    branch_policy = workflow.get("branchPolicy")
    if not isinstance(branch_policy, dict):
        return None
    return _coerce_non_negative_int(branch_policy.get("lockBoundaryOrder"))


def _nodes_by_order(workflow: Dict[str, Any] | None) -> Dict[int, Dict[str, Any]]:
    if not isinstance(workflow, dict):
        return {}
    nodes = workflow.get("nodes")
    if not isinstance(nodes, list):
        return {}
    by_order: Dict[int, Dict[str, Any]] = {}
    for node in nodes:
        if not isinstance(node, dict):
            continue
        order = _coerce_non_negative_int(node.get("order"))
        if order is None:
            continue
        by_order[order] = node
    return by_order


def _sanitize_node_for_immutability(node: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(node)
    # Runtime-derivable field: do not treat as immutable payload content.
    clean.pop("locked", None)
    return clean


def _locked_beat_ids(workflow: Dict[str, Any] | None, boundary_order: int) -> Set[str]:
    out: Set[str] = set()
    for order, node in _nodes_by_order(workflow).items():
        if order >= boundary_order:
            continue
        beat_ids = node.get("beatIds")
        if not isinstance(beat_ids, list):
            continue
        for beat_id in beat_ids:
            if isinstance(beat_id, str) and beat_id.strip():
                out.add(beat_id)
    return out


def _extract_beats(payload: Dict[str, Any] | None) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    editor_state = payload.get("editorState")
    if not isinstance(editor_state, dict):
        return {}
    beats = editor_state.get("beats")
    if not isinstance(beats, dict):
        return {}
    return beats


def _enforce_story_boundary_lock_update(
    previous_payload: Dict[str, Any] | None,
    next_payload: Dict[str, Any],
) -> None:
    previous_workflow = _extract_story_workflow(previous_payload)
    previous_boundary = _extract_lock_boundary_order(previous_workflow)
    if previous_boundary is None:
        return

    next_workflow = _extract_story_workflow(next_payload)
    if not isinstance(next_workflow, dict):
        raise HTTPException(
            status_code=400,
            detail="storyWorkflow is required when branch lock boundary is configured",
        )

    next_boundary = _extract_lock_boundary_order(next_workflow)
    if next_boundary is None:
        raise HTTPException(
            status_code=400,
            detail="lockBoundaryOrder is required when branch lock boundary is configured",
        )

    if next_boundary < previous_boundary:
        raise HTTPException(
            status_code=400,
            detail=f"lockBoundaryOrder cannot move backward (current: {previous_boundary}, next: {next_boundary})",
        )

    previous_nodes = _nodes_by_order(previous_workflow)
    next_nodes = _nodes_by_order(next_workflow)
    for order in range(previous_boundary):
        previous_node = previous_nodes.get(order)
        next_node = next_nodes.get(order)
        if previous_node is None or next_node is None:
            raise HTTPException(
                status_code=400,
                detail=f"Locked story node at order {order} must be preserved",
            )
        if _stable_json(_sanitize_node_for_immutability(previous_node)) != _stable_json(
            _sanitize_node_for_immutability(next_node)
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Locked story node at order {order} is immutable",
            )

    locked_beat_ids = _locked_beat_ids(previous_workflow, previous_boundary)
    if not locked_beat_ids:
        return
    previous_beats = _extract_beats(previous_payload)
    next_beats = _extract_beats(next_payload)
    for beat_id in locked_beat_ids:
        if _stable_json(previous_beats.get(beat_id)) != _stable_json(next_beats.get(beat_id)):
            raise HTTPException(
                status_code=400,
                detail=f"Locked beat {beat_id} is immutable",
            )


def _project_can_be_fork_requested(project: Any, current_user: User) -> bool:
    # Fork request requires requester can at least access the project.
    # For private projects, only owner can initiate request in this lightweight policy.
    return bool(project.is_public) or project.owner_internal_id == current_user.internal_id

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
    Retrieve current user's owned projects.
    Branch participations are returned by `/projects/branch-participations`.
    """
    return await ProjectService.get_user_projects(db, current_user.internal_id, skip, limit)


@router.get("/branch-participations", response_model=List[Project])
async def read_branch_participated_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    projects = await ProjectService.get_branch_participated_projects(db, current_user.internal_id, skip, limit)
    if not projects:
        return []

    project_internal_ids = [project.internal_id for project in projects]
    branch_res = await db.execute(
        select(Branch.project_id, Branch.name).where(
            Branch.project_id.in_(project_internal_ids),
            Branch.creator_internal_id == current_user.internal_id,
        )
    )
    branches = branch_res.all()
    branch_names_by_project: Dict[int, List[str]] = {}
    for project_internal_id, branch_name in branches:
        names = branch_names_by_project.setdefault(project_internal_id, [])
        if isinstance(branch_name, str) and branch_name not in names:
            names.append(branch_name)

    for project in projects:
        setattr(project, "participated_branch_names", branch_names_by_project.get(project.internal_id, []))
    return projects

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
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="workspace payload must be an object")

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

    try:
        _enforce_story_boundary_lock_update(branch.workspace_data if isinstance(branch.workspace_data, dict) else None, payload)
    except HTTPException:
        await db.rollback()
        raise
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


class ForkRequestCreate(BaseModel):
    commit_hash: Optional[str] = None


class ForkRequestResponse(BaseModel):
    id: str
    project_id: str
    requester_id: str
    commit_hash: Optional[str] = None
    status: str
    approved_project_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


def _fork_request_payload(
    req: ForkRequest,
    project_public_id: str,
    requester_public_id: str,
    reviewer_public_id: Optional[str] = None,
    approved_project_public_id: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "id": req.public_id,
        "project_id": project_public_id,
        "requester_id": requester_public_id,
        "commit_hash": req.commit_hash,
        "status": req.status,
        "approved_project_id": approved_project_public_id,
        "reviewer_id": reviewer_public_id,
        "created_at": req.created_at,
        "reviewed_at": req.reviewed_at,
    }


@router.post("/{project_id}/fork", response_model=Project)
async def fork_project(
    project_id: str,
    fork_in: ProjectFork,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Fork a project.
    Direct fork is restricted to project owner.
    Non-owner users must create a fork request for owner approval.
    """
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(
            status_code=403,
            detail="Fork requires repository owner approval. Submit POST /projects/{project_id}/fork-requests first.",
        )
    if not _project_can_be_fork_requested(project, current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    try:
        return await ProjectService.fork_project(db, project.internal_id, current_user.internal_id, fork_in.commit_hash)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{project_id}/fork-requests", response_model=ForkRequestResponse)
async def create_fork_request(
    project_id: str,
    body: ForkRequestCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id == current_user.internal_id:
        raise HTTPException(
            status_code=400,
            detail="Project owner should use POST /projects/{project_id}/fork directly.",
        )
    if not _project_can_be_fork_requested(project, current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pending_res = await db.execute(
        select(ForkRequest).where(
            ForkRequest.project_internal_id == project.internal_id,
            ForkRequest.requester_internal_id == current_user.internal_id,
            ForkRequest.status == "pending",
        )
    )
    pending_items = pending_res.scalars().all()
    for item in pending_items:
        if (item.commit_hash or None) == (body.commit_hash or None):
            raise HTTPException(status_code=400, detail="A pending fork request already exists for this commit")

    req = ForkRequest(
        project_internal_id=project.internal_id,
        requester_internal_id=current_user.internal_id,
        commit_hash=body.commit_hash,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return ForkRequestResponse.model_validate(
        _fork_request_payload(
            req=req,
            project_public_id=project.public_id,
            requester_public_id=current_user.public_id,
        )
    )


@router.get("/{project_id}/fork-requests", response_model=List[ForkRequestResponse])
async def list_fork_requests(
    project_id: str,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_internal_id == current_user.internal_id
    if not is_owner and not _project_can_be_fork_requested(project, current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    query = select(ForkRequest).where(ForkRequest.project_internal_id == project.internal_id)
    if not is_owner:
        query = query.where(ForkRequest.requester_internal_id == current_user.internal_id)
    if isinstance(status_filter, str) and status_filter.strip():
        query = query.where(ForkRequest.status == status_filter.strip())
    query = query.order_by(ForkRequest.created_at.desc())

    res = await db.execute(query)
    items = res.scalars().all()
    if not items:
        return []

    requester_ids = {item.requester_internal_id for item in items}
    reviewer_ids = {item.reviewer_internal_id for item in items if item.reviewer_internal_id}
    approved_project_ids = {item.approved_project_internal_id for item in items if item.approved_project_internal_id}

    users: Dict[int, User] = {}
    if requester_ids or reviewer_ids:
        users_res = await db.execute(select(User).where(User.internal_id.in_(requester_ids | reviewer_ids)))
        users = {u.internal_id: u for u in users_res.scalars().all()}

    projects_by_id: Dict[int, ProjectModel] = {}
    if approved_project_ids:
        approved_res = await db.execute(select(ProjectModel).where(ProjectModel.internal_id.in_(approved_project_ids)))
        projects_by_id = {p.internal_id: p for p in approved_res.scalars().all()}

    output: List[ForkRequestResponse] = []
    for item in items:
        requester_public_id = users.get(item.requester_internal_id).public_id if users.get(item.requester_internal_id) else str(item.requester_internal_id)
        reviewer_user = users.get(item.reviewer_internal_id) if item.reviewer_internal_id else None
        approved_project = projects_by_id.get(item.approved_project_internal_id) if item.approved_project_internal_id else None
        output.append(
            ForkRequestResponse.model_validate(
                _fork_request_payload(
                    req=item,
                    project_public_id=project.public_id,
                    requester_public_id=requester_public_id,
                    reviewer_public_id=reviewer_user.public_id if reviewer_user else None,
                    approved_project_public_id=approved_project.public_id if approved_project else None,
                )
            )
        )
    return output


@router.post("/{project_id}/fork-requests/{request_id}/approve", response_model=ForkRequestResponse)
async def approve_fork_request(
    project_id: str,
    request_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Only project owner can approve fork requests")

    req_res = await db.execute(
        select(ForkRequest).where(
            ForkRequest.project_internal_id == project.internal_id,
            ForkRequest.public_id == request_id,
        )
    )
    req = req_res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Fork request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Fork request already {req.status}")

    try:
        new_project = await ProjectService.fork_project(
            db=db,
            source_project_id=project.internal_id,
            user_id=req.requester_internal_id,
            commit_hash=req.commit_hash,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    req.status = "approved"
    req.reviewer_internal_id = current_user.internal_id
    req.reviewed_at = datetime.now(timezone.utc)
    req.approved_project_internal_id = new_project.internal_id
    db.add(req)
    await db.commit()
    await db.refresh(req)

    requester = await db.get(User, req.requester_internal_id)
    return ForkRequestResponse.model_validate(
        _fork_request_payload(
            req=req,
            project_public_id=project.public_id,
            requester_public_id=requester.public_id if requester else str(req.requester_internal_id),
            reviewer_public_id=current_user.public_id,
            approved_project_public_id=new_project.public_id,
        )
    )


@router.post("/{project_id}/fork-requests/{request_id}/reject", response_model=ForkRequestResponse)
async def reject_fork_request(
    project_id: str,
    request_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project = await ProjectService.resolve_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Only project owner can reject fork requests")

    req_res = await db.execute(
        select(ForkRequest).where(
            ForkRequest.project_internal_id == project.internal_id,
            ForkRequest.public_id == request_id,
        )
    )
    req = req_res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Fork request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Fork request already {req.status}")

    req.status = "rejected"
    req.reviewer_internal_id = current_user.internal_id
    req.reviewed_at = datetime.now(timezone.utc)
    db.add(req)
    await db.commit()
    await db.refresh(req)

    requester = await db.get(User, req.requester_internal_id)
    return ForkRequestResponse.model_validate(
        _fork_request_payload(
            req=req,
            project_public_id=project.public_id,
            requester_public_id=requester.public_id if requester else str(req.requester_internal_id),
            reviewer_public_id=current_user.public_id,
            approved_project_public_id=None,
        )
    )


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
