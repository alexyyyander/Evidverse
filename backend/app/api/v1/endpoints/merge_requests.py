from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.branch import Branch
from app.models.clip_segment import ClipSegment as ClipSegmentModel
from app.models.merge_request import MergeRequest as MergeRequestModel
from app.models.project import Project
from app.models.user import User
from app.schemas.merge_request import MergeRequest as MergeRequestSchema, MergeRequestCreate
from app.services.publish_service import publish_service


router = APIRouter()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _resolve_project(db: AsyncSession, project_id: str) -> tuple[int, Project]:
    project_internal_id = await publish_service.resolve_project_internal_id(db, project_id)
    if not project_internal_id:
        raise HTTPException(status_code=404, detail="Project not found")
    project = await db.get(Project, project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_internal_id, project


async def _resolve_branch(db: AsyncSession, project_internal_id: int, branch_name: str) -> tuple[int, Branch]:
    name = (branch_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="branch_name is required")
    bid = await publish_service.resolve_branch_id(db, project_internal_id, name)
    if not bid:
        raise HTTPException(status_code=404, detail="Branch not found")
    branch = await db.get(Branch, bid)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return bid, branch


def _to_schema_dict(
    *,
    mr: MergeRequestModel,
    project_id: str,
    source_branch_name: str,
    target_branch_name: str,
    merged_by: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "id": mr.public_id,
        "project_id": project_id,
        "source_branch_name": source_branch_name,
        "target_branch_name": target_branch_name,
        "title": mr.title,
        "description": mr.description,
        "clip_ids": mr.clip_ids if isinstance(mr.clip_ids, list) else None,
        "merged_clip_ids": mr.merged_clip_ids if isinstance(mr.merged_clip_ids, list) else None,
        "status": mr.status,
        "merged_by": merged_by,
        "merged_at": mr.merged_at,
        "created_at": mr.created_at,
    }


@router.post("/projects/{project_id}/merge-requests", response_model=MergeRequestSchema)
async def create_merge_request(
    project_id: str,
    body: MergeRequestCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_internal_id, project = await _resolve_project(db, project_id)
    source_branch_id, source_branch = await _resolve_branch(db, project_internal_id, body.source_branch_name)
    target_branch_id, target_branch = await _resolve_branch(db, project_internal_id, body.target_branch_name or "main")
    if source_branch_id == target_branch_id:
        raise HTTPException(status_code=400, detail="source and target branch must differ")

    is_owner = project.owner_internal_id == current_user.internal_id
    is_source_creator = source_branch.creator_internal_id == current_user.internal_id
    if not (is_owner or is_source_creator):
        raise HTTPException(status_code=403, detail="Not allowed to create merge request")

    clip_ids = body.clip_ids if isinstance(body.clip_ids, list) and body.clip_ids else None
    if clip_ids is None:
        res = await db.execute(
            select(ClipSegmentModel.public_id)
            .where(
                ClipSegmentModel.project_internal_id == project_internal_id,
                ClipSegmentModel.branch_id == source_branch_id,
            )
            .order_by(ClipSegmentModel.internal_id.desc())
            .limit(200)
        )
        clip_ids = [row[0] for row in res.all()]

    mr = MergeRequestModel(
        creator_internal_id=current_user.internal_id,
        project_internal_id=project_internal_id,
        source_branch_id=source_branch_id,
        target_branch_id=target_branch_id,
        title=body.title,
        description=body.description,
        clip_ids=clip_ids,
        status="open",
    )
    db.add(mr)
    await db.commit()
    await db.refresh(mr)

    return MergeRequestSchema.model_validate(
        _to_schema_dict(
            mr=mr,
            project_id=project_id,
            source_branch_name=source_branch.name,
            target_branch_name=target_branch.name,
        )
    )


@router.get("/projects/{project_id}/merge-requests", response_model=list[MergeRequestSchema])
async def list_merge_requests(
    project_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_internal_id, project = await _resolve_project(db, project_id)
    is_owner = project.owner_internal_id == current_user.internal_id

    q = select(MergeRequestModel).where(MergeRequestModel.project_internal_id == project_internal_id)
    if not is_owner:
        q = q.where(MergeRequestModel.creator_internal_id == current_user.internal_id)

    res = await db.execute(q.order_by(MergeRequestModel.internal_id.desc()).limit(200))
    items = list(res.scalars().all())
    out: list[MergeRequestSchema] = []
    for mr in items:
        sb = await db.get(Branch, mr.source_branch_id)
        tb = await db.get(Branch, mr.target_branch_id)
        out.append(
            MergeRequestSchema.model_validate(
                _to_schema_dict(
                    mr=mr,
                    project_id=project_id,
                    source_branch_name=sb.name if sb else "",
                    target_branch_name=tb.name if tb else "",
                )
            )
        )
    return out


@router.get("/merge-requests/{mr_id}", response_model=MergeRequestSchema)
async def get_merge_request(
    mr_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    mr = (await db.execute(select(MergeRequestModel).where(MergeRequestModel.public_id == mr_id))).scalar_one_or_none()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge request not found")

    project = await db.get(Project, mr.project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_internal_id == current_user.internal_id
    is_creator = mr.creator_internal_id == current_user.internal_id
    if not (is_owner or is_creator):
        raise HTTPException(status_code=404, detail="Merge request not found")

    project_id = await publish_service.resolve_project_public_id(db, mr.project_internal_id)
    sb = await db.get(Branch, mr.source_branch_id)
    tb = await db.get(Branch, mr.target_branch_id)
    return MergeRequestSchema.model_validate(
        _to_schema_dict(
            mr=mr,
            project_id=project_id or "",
            source_branch_name=sb.name if sb else "",
            target_branch_name=tb.name if tb else "",
        )
    )


@router.post("/merge-requests/{mr_id}/close", response_model=MergeRequestSchema)
async def close_merge_request(
    mr_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    mr = (await db.execute(select(MergeRequestModel).where(MergeRequestModel.public_id == mr_id))).scalar_one_or_none()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge request not found")
    if mr.status != "open":
        raise HTTPException(status_code=400, detail="Merge request is not open")

    project = await db.get(Project, mr.project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_internal_id == current_user.internal_id
    is_creator = mr.creator_internal_id == current_user.internal_id
    if not (is_owner or is_creator):
        raise HTTPException(status_code=403, detail="Not allowed to close merge request")

    mr.status = "closed"
    await db.commit()
    await db.refresh(mr)

    project_id = await publish_service.resolve_project_public_id(db, mr.project_internal_id)
    sb = await db.get(Branch, mr.source_branch_id)
    tb = await db.get(Branch, mr.target_branch_id)
    return MergeRequestSchema.model_validate(
        _to_schema_dict(
            mr=mr,
            project_id=project_id or "",
            source_branch_name=sb.name if sb else "",
            target_branch_name=tb.name if tb else "",
        )
    )


@router.post("/merge-requests/{mr_id}/merge", response_model=MergeRequestSchema)
async def merge_merge_request(
    mr_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    mr = (await db.execute(select(MergeRequestModel).where(MergeRequestModel.public_id == mr_id))).scalar_one_or_none()
    if not mr:
        raise HTTPException(status_code=404, detail="Merge request not found")
    if mr.status != "open":
        raise HTTPException(status_code=400, detail="Merge request is not open")

    project = await db.get(Project, mr.project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Only project owner can merge")

    clip_ids = mr.clip_ids if isinstance(mr.clip_ids, list) else []
    merged_clip_ids: list[str] = []
    for public_id in clip_ids:
        clip = (
            await db.execute(
                select(ClipSegmentModel).where(
                    ClipSegmentModel.project_internal_id == mr.project_internal_id,
                    ClipSegmentModel.branch_id == mr.source_branch_id,
                    ClipSegmentModel.public_id == public_id,
                )
            )
        ).scalar_one_or_none()
        if not clip:
            continue
        merged = ClipSegmentModel(
            owner_internal_id=clip.owner_internal_id,
            project_internal_id=clip.project_internal_id,
            branch_id=mr.target_branch_id,
            title=clip.title,
            summary=clip.summary,
            input_artifacts={
                "merged_from_clip_id": clip.public_id,
                "merged_from_mr_id": mr.public_id,
                "merged_from_branch_id": mr.source_branch_id,
                "original": clip.input_artifacts,
            },
            assets_ref=clip.assets_ref,
            celery_task_id=clip.celery_task_id,
            status=clip.status,
            result=clip.result,
            error=clip.error,
        )
        db.add(merged)
        await db.flush()
        merged_clip_ids.append(merged.public_id)

    mr.status = "merged"
    mr.merged_by_internal_id = current_user.internal_id
    mr.merged_at = _now()
    mr.merged_clip_ids = merged_clip_ids
    await db.commit()
    await db.refresh(mr)

    project_id = await publish_service.resolve_project_public_id(db, mr.project_internal_id)
    sb = await db.get(Branch, mr.source_branch_id)
    tb = await db.get(Branch, mr.target_branch_id)
    return MergeRequestSchema.model_validate(
        _to_schema_dict(
            mr=mr,
            project_id=project_id or "",
            source_branch_name=sb.name if sb else "",
            target_branch_name=tb.name if tb else "",
            merged_by=current_user.id,
        )
    )
