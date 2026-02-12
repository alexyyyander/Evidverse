from typing import Any, Optional

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.clip_segment import ClipSegment as ClipSegmentModel
from app.models.project import Project
from app.models.user import User
from app.schemas.clips import ClipSegment as ClipSegmentSchema
from app.services.publish_service import publish_service


router = APIRouter()


def _is_terminal(status: str) -> bool:
    s = (status or "").strip().lower()
    return s in {"succeeded", "failed", "success", "failure", "revoked"}


@router.get("/", response_model=list[ClipSegmentSchema])
async def list_clips(
    project_id: Optional[str] = None,
    branch_name: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = select(ClipSegmentModel)
    project_internal_id: Optional[int] = None
    if project_id:
        project_internal_id = await publish_service.resolve_project_internal_id(db, project_id)
        if not project_internal_id:
            raise HTTPException(status_code=404, detail="Project not found")
        project = await db.get(Project, project_internal_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.owner_internal_id != current_user.internal_id:
            q = q.where(ClipSegmentModel.owner_internal_id == current_user.internal_id)
        q = q.where(ClipSegmentModel.project_internal_id == project_internal_id)
        if branch_name:
            bid = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
            if not bid:
                raise HTTPException(status_code=404, detail="Branch not found")
            q = q.where(ClipSegmentModel.branch_id == bid)
    else:
        q = q.where(ClipSegmentModel.owner_internal_id == current_user.internal_id)

    res = await db.execute(q.order_by(ClipSegmentModel.internal_id.desc()).limit(200))
    items = list(res.scalars().all())
    out: list[ClipSegmentSchema] = []
    for c in items:
        pid = project_id or (await publish_service.resolve_project_public_id(db, c.project_internal_id)) or ""
        bn = branch_name or (await publish_service.resolve_branch_name(db, c.branch_id))
        out.append(
            ClipSegmentSchema.model_validate(
                {
                    "id": c.public_id,
                    "project_id": pid,
                    "branch_name": bn,
                    "title": c.title,
                    "summary": c.summary,
                    "input_artifacts": c.input_artifacts,
                    "assets_ref": c.assets_ref,
                    "task_id": c.celery_task_id,
                    "status": c.status,
                    "result": c.result,
                    "error": c.error,
                    "created_at": c.created_at,
                }
            )
        )
    return out


@router.get("/{clip_id}", response_model=ClipSegmentSchema)
async def get_clip(
    clip_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User | None = Depends(deps.get_current_user_optional),
) -> Any:
    clip = (await db.execute(select(ClipSegmentModel).where(ClipSegmentModel.public_id == clip_id))).scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    project = await db.get(Project, clip.project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    allowed = bool(project.is_public) or (
        current_user is not None
        and (project.owner_internal_id == current_user.internal_id or clip.owner_internal_id == current_user.internal_id)
    )
    if not allowed:
        raise HTTPException(status_code=404, detail="Clip not found")

    task_id = clip.celery_task_id
    if task_id and not _is_terminal(clip.status):
        try:
            ar = AsyncResult(task_id)
            status = (ar.status or "").lower()
            if status in {"success", "failure", "revoked"}:
                result = ar.result
                if status == "success":
                    clip.status = "succeeded" if isinstance(result, dict) and result.get("status") == "succeeded" else "succeeded"
                    clip.result = result if isinstance(result, dict) else {"result": result}
                    clip.error = None
                    if isinstance(result, dict) and result.get("video_url"):
                        assets = dict(clip.assets_ref) if isinstance(clip.assets_ref, dict) else {}
                        assets["video_url"] = result.get("video_url")
                        clip.assets_ref = assets
                else:
                    clip.status = "failed"
                    clip.error = str(result)
                    clip.result = {"error": str(result)}
                await db.commit()
                await db.refresh(clip)
        except Exception:
            pass

    project_id = await publish_service.resolve_project_public_id(db, clip.project_internal_id)
    branch_name = await publish_service.resolve_branch_name(db, clip.branch_id)
    return ClipSegmentSchema.model_validate(
        {
            "id": clip.public_id,
            "project_id": project_id or "",
            "branch_name": branch_name,
            "title": clip.title,
            "summary": clip.summary,
            "input_artifacts": clip.input_artifacts,
            "assets_ref": clip.assets_ref,
            "task_id": clip.celery_task_id,
            "status": clip.status,
            "result": clip.result,
            "error": clip.error,
            "created_at": clip.created_at,
        }
    )
