from typing import Any, Optional

from celery.result import AsyncResult

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.models.clip_segment import ClipSegment as ClipSegmentModel
from app.models.vn import VNAsset, VNParseJob
from app.models.project import Project
from app.schemas.clips import ClipSegment as ClipSegmentSchema, ClipSegmentCreate
from app.schemas.vn import (
    VNAsset as VNAssetSchema,
    VNAssetCreate,
    VNParseJob as VNParseJobSchema,
    VNParseJobCreate,
    VNParsePreviewRequest,
    VNParsePreviewResponse,
)
from app.services.publish_service import publish_service
from app.services.vn_parse_service import vn_parse_service
from app.workers.video_tasks import generate_video_from_image
from app.workers.vn_tasks import vn_parse_job as vn_parse_job_task


router = APIRouter()


def _public_storage_url(object_name: str) -> str:
    base = str(settings.S3_ENDPOINT_URL).rstrip("/")
    return f"{base}/{settings.S3_BUCKET_NAME}/{object_name.lstrip('/')}"


@router.post("/comic-to-video", response_model=ClipSegmentSchema)
async def comic_to_video(
    body: ClipSegmentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_internal_id = await publish_service.resolve_project_internal_id(db, body.project_id)
    if not project_internal_id:
        raise HTTPException(status_code=404, detail="Project not found")
    project = await db.get(Project, project_internal_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    branch_id: Optional[int] = None
    branch_name: Optional[str] = (body.branch_name or "").strip() or None
    if branch_name:
        branch_id = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
        if not branch_id:
            raise HTTPException(status_code=404, detail="Branch not found")

    if not body.screenshot_asset_ids:
        raise HTTPException(status_code=400, detail="screenshot_asset_ids is required")

    screenshot_urls: list[str] = []
    for public_id in body.screenshot_asset_ids[:20]:
        asset = (
            await db.execute(
                select(VNAsset).where(
                    VNAsset.owner_internal_id == current_user.internal_id,
                    VNAsset.project_internal_id == project_internal_id,
                    VNAsset.public_id == public_id,
                )
            )
        ).scalar_one_or_none()
        if not asset:
            raise HTTPException(status_code=404, detail=f"VNAsset not found: {public_id}")
        if str(asset.type).upper() != "SCREENSHOT":
            raise HTTPException(status_code=400, detail=f"VNAsset is not SCREENSHOT: {public_id}")
        screenshot_urls.append(str(asset.storage_url))

    prompt = (body.prompt or "").strip() or "comic-to-video"
    clip = ClipSegmentModel(
        owner_internal_id=current_user.internal_id,
        project_internal_id=project_internal_id,
        branch_id=branch_id,
        title=body.title,
        summary=body.summary,
        input_artifacts={
            "screenshot_asset_ids": body.screenshot_asset_ids,
            "screenshot_urls": screenshot_urls,
            "prompt": prompt,
        },
        assets_ref={"screenshots": screenshot_urls},
        status="pending",
    )
    db.add(clip)
    await db.commit()
    await db.refresh(clip)

    task = generate_video_from_image.delay(screenshot_urls[0], prompt)
    clip.celery_task_id = task.id
    await db.commit()
    await db.refresh(clip)

    return ClipSegmentSchema.model_validate(
        {
            "id": clip.public_id,
            "project_id": body.project_id,
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


@router.post("/assets", response_model=VNAssetSchema)
async def create_vn_asset(
    body: VNAssetCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_internal_id = await publish_service.resolve_project_internal_id(db, body.project_id)
    if not project_internal_id:
        raise HTTPException(status_code=404, detail="Project not found")

    branch_id: Optional[int] = None
    branch_name: Optional[str] = (body.branch_name or "").strip() or None
    if branch_name:
        branch_id = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
        if not branch_id:
            raise HTTPException(status_code=404, detail="Branch not found")

    object_name = (body.object_name or "").strip()
    if not object_name:
        raise HTTPException(status_code=400, detail="object_name is required")

    asset = VNAsset(
        owner_internal_id=current_user.internal_id,
        project_internal_id=project_internal_id,
        branch_id=branch_id,
        type=body.type,
        object_name=object_name,
        storage_url=_public_storage_url(object_name),
        meta=body.metadata,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return VNAssetSchema.model_validate(
        {
            "id": asset.public_id,
            "project_id": body.project_id,
            "branch_name": branch_name,
            "type": asset.type,
            "object_name": asset.object_name,
            "storage_url": asset.storage_url,
            "metadata": asset.meta,
            "created_at": asset.created_at,
        }
    )


@router.get("/assets", response_model=list[VNAssetSchema])
async def list_vn_assets(
    project_id: Optional[str] = None,
    branch_name: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = select(VNAsset).where(VNAsset.owner_internal_id == current_user.internal_id)

    if project_id:
        project_internal_id = await publish_service.resolve_project_internal_id(db, project_id)
        if not project_internal_id:
            raise HTTPException(status_code=404, detail="Project not found")
        q = q.where(VNAsset.project_internal_id == project_internal_id)

        if branch_name:
            b = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
            if not b:
                raise HTTPException(status_code=404, detail="Branch not found")
            q = q.where(VNAsset.branch_id == b)

    if type:
        q = q.where(VNAsset.type == type)

    res = await db.execute(q.order_by(VNAsset.internal_id.desc()).limit(200))
    items = list(res.scalars().all())

    out: list[VNAssetSchema] = []
    for a in items:
        pid = project_id or str(a.project_internal_id)
        bn = None
        if project_id and branch_name:
            bn = branch_name
        out.append(
            VNAssetSchema.model_validate(
                {
                    "id": a.public_id,
                    "project_id": pid,
                    "branch_name": bn,
                    "type": a.type,
                    "object_name": a.object_name,
                    "storage_url": a.storage_url,
                    "metadata": a.meta,
                    "created_at": a.created_at,
                }
            )
        )
    return out

@router.post("/parse-preview", response_model=VNParsePreviewResponse)
async def parse_preview(
    body: VNParsePreviewRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    text = (body.script_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="script_text is required")

    try:
        events = vn_parse_service.parse(body.engine, text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"engine": body.engine, "events": events}


@router.post("/parse-jobs", response_model=VNParseJobSchema)
async def create_vn_parse_job(
    body: VNParseJobCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    project_internal_id = await publish_service.resolve_project_internal_id(db, body.project_id)
    if not project_internal_id:
        raise HTTPException(status_code=404, detail="Project not found")

    branch_id: Optional[int] = None
    branch_name: Optional[str] = (body.branch_name or "").strip() or None
    if branch_name:
        branch_id = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
        if not branch_id:
            raise HTTPException(status_code=404, detail="Branch not found")

    inputs: list[dict[str, Any]] = []
    if (body.script_text or "").strip():
        inputs.append({"kind": "text", "engine": body.engine, "text": body.script_text})

    if body.asset_ids:
        for public_id in body.asset_ids:
            asset = (
                await db.execute(
                    select(VNAsset).where(
                        VNAsset.owner_internal_id == current_user.internal_id,
                        VNAsset.project_internal_id == project_internal_id,
                        VNAsset.public_id == public_id,
                    )
                )
            ).scalar_one_or_none()
            if not asset:
                raise HTTPException(status_code=404, detail=f"VNAsset not found: {public_id}")
            inputs.append({"kind": "asset", "asset_id": asset.public_id, "storage_url": asset.storage_url})

    if not inputs:
        raise HTTPException(status_code=400, detail="script_text or asset_ids is required")

    job = VNParseJob(
        owner_internal_id=current_user.internal_id,
        project_internal_id=project_internal_id,
        branch_id=branch_id,
        engine_hint=body.engine,
        inputs=inputs,
        status="pending",
        attempts=0,
        logs=[],
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    task = vn_parse_job_task.delay(job.internal_id)
    job.celery_task_id = task.id
    await db.commit()
    await db.refresh(job)

    return VNParseJobSchema.model_validate(
        {
            "id": job.public_id,
            "project_id": body.project_id,
            "branch_name": branch_name,
            "engine": body.engine,
            "status": job.status,
            "task_id": job.celery_task_id,
            "attempts": job.attempts,
            "result": job.result,
            "logs": job.logs,
            "error": job.error,
        }
    )


@router.get("/parse-jobs/{job_id}", response_model=VNParseJobSchema)
async def get_vn_parse_job(
    job_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    job = (
        await db.execute(
            select(VNParseJob).where(VNParseJob.owner_internal_id == current_user.internal_id, VNParseJob.public_id == job_id)
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="VNParseJob not found")

    task_id = job.celery_task_id
    if task_id:
        ar = AsyncResult(task_id)
        status = ar.status.lower()
        if status in {"success", "failure", "revoked"}:
            result = ar.result
            if status == "success":
                job.status = "succeeded" if isinstance(result, dict) and result.get("status") == "succeeded" else "succeeded"
                job.result = result if isinstance(result, dict) else {"result": result}
                job.error = None
            else:
                job.status = "failed"
                job.error = str(result)
                job.result = {"error": str(result)}
            await db.commit()

    project_id = await publish_service.resolve_project_public_id(db, job.project_internal_id)
    branch_name = await publish_service.resolve_branch_name(db, job.branch_id)
    return VNParseJobSchema.model_validate(
        {
            "id": job.public_id,
            "project_id": project_id or "",
            "branch_name": branch_name,
            "engine": job.engine_hint,
            "status": job.status,
            "task_id": job.celery_task_id,
            "attempts": job.attempts,
            "result": job.result,
            "logs": job.logs,
            "error": job.error,
        }
    )


@router.get("/parse-jobs/{job_id}/logs")
async def get_vn_parse_job_logs(
    job_id: str,
    offset: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    job = (
        await db.execute(
            select(VNParseJob).where(VNParseJob.owner_internal_id == current_user.internal_id, VNParseJob.public_id == job_id)
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="VNParseJob not found")
    logs = list(job.logs) if isinstance(job.logs, list) else []
    o = max(int(offset), 0)
    l = min(max(int(limit), 1), 500)
    return {"items": logs[o : o + l], "total": len(logs), "offset": o, "limit": l}
