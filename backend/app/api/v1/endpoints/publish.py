from typing import Any, List, Optional

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.publish import PublishAccount, PublishAccountCreate, PublishJob, PublishJobCreate
from app.services.publish_service import publish_service
from app.services.project_service import ProjectService
from app.workers.publish_tasks import publish_job as publish_job_task


router = APIRouter()


@router.post("/accounts", response_model=PublishAccount)
async def create_publish_account(
    body: PublishAccountCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    acc = await publish_service.create_account(
        db=db,
        owner_internal_id=current_user.internal_id,
        platform=body.platform,
        label=body.label,
        credential_json=body.credential_json,
    )
    return acc


@router.get("/accounts", response_model=List[PublishAccount])
async def list_publish_accounts(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await publish_service.list_accounts(db, current_user.internal_id)


@router.post("/accounts/{account_id}/validate", response_model=PublishAccount)
async def validate_publish_account(
    account_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    account = await publish_service.get_account_by_public_id(db, current_user.internal_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Publish account not found")
    return await publish_service.validate_account(db, current_user.internal_id, account)


@router.post("/accounts/{account_id}/disable", response_model=PublishAccount)
async def disable_publish_account(
    account_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    account = await publish_service.get_account_by_public_id(db, current_user.internal_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Publish account not found")
    return await publish_service.set_account_status(db, current_user.internal_id, account, "disabled")


@router.delete("/accounts/{account_id}")
async def delete_publish_account(
    account_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    account = await publish_service.get_account_by_public_id(db, current_user.internal_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Publish account not found")
    await publish_service.delete_account(db, current_user.internal_id, account)
    return {"ok": True}


@router.post("/jobs", response_model=PublishJob)
async def create_publish_job(
    body: PublishJobCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    account = await publish_service.get_account_by_public_id(db, current_user.internal_id, body.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Publish account not found")

    project_internal_id: Optional[int] = None
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None

    if body.project_id:
        project = await ProjectService.resolve_project(db, body.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.owner_internal_id != current_user.internal_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        project_internal_id = project.internal_id
        branch_name = body.branch_name or "main"
        branch_id = await publish_service.resolve_branch_id(db, project_internal_id, branch_name)
        if not branch_id:
            raise HTTPException(status_code=404, detail="Branch not found")

    video_url = (body.video_url or "").strip()
    if not video_url:
        if not project_internal_id or not branch_name:
            raise HTTPException(status_code=400, detail="video_url is required when project_id is not provided")
        video_url = await publish_service.resolve_publish_video_source(db, project_internal_id, branch_name)

    job = await publish_service.create_job(
        db=db,
        owner_internal_id=current_user.internal_id,
        account=account,
        project_internal_id=project_internal_id,
        branch_id=branch_id,
        video_url=video_url,
        title=body.title,
        description=body.description,
        tags=body.tags,
        bilibili_tid=body.bilibili_tid,
        cover_url=body.cover_url,
        scheduled_publish_at=body.scheduled_publish_at,
        multi_part=bool(body.multi_part),
    )

    task = publish_job_task.delay(job.internal_id)
    job.celery_task_id = task.id
    job.status = "pending"
    await db.commit()
    await db.refresh(job)

    return PublishJob.model_validate(
        {
            "id": job.public_id,
            "platform": job.platform,
            "account_id": body.account_id,
            "project_id": body.project_id,
            "branch_name": branch_name,
            "video_url": job.video_url,
            "title": job.title,
            "description": job.description,
            "tags": job.tags,
            "bilibili_tid": job.bilibili_tid,
            "cover_url": job.cover_url,
            "scheduled_publish_at": job.scheduled_publish_at,
            "multi_part": job.multi_part,
            "input_artifacts": job.input_artifacts,
            "attempts": job.attempts,
            "task_id": job.celery_task_id,
            "status": job.status,
            "result": job.result,
            "logs": job.logs,
            "error": job.error,
        }
    )


@router.get("/jobs/{job_id}", response_model=PublishJob)
async def get_publish_job(
    job_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    job = await publish_service.get_job_by_public_id(db, current_user.internal_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")

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

    account = await publish_service.get_account_by_internal_id(db, current_user.internal_id, job.account_internal_id)
    project_id = await publish_service.resolve_project_public_id(db, job.project_internal_id)
    branch_name = await publish_service.resolve_branch_name(db, job.branch_id)
    return PublishJob.model_validate(
        {
            "id": job.public_id,
            "platform": job.platform,
            "account_id": account.id if account else "",
            "project_id": project_id,
            "branch_name": branch_name,
            "video_url": job.video_url,
            "title": job.title,
            "description": job.description,
            "tags": job.tags,
            "bilibili_tid": job.bilibili_tid,
            "cover_url": job.cover_url,
            "scheduled_publish_at": job.scheduled_publish_at,
            "multi_part": job.multi_part,
            "input_artifacts": job.input_artifacts,
            "attempts": job.attempts,
            "task_id": job.celery_task_id,
            "status": job.status,
            "result": job.result,
            "logs": job.logs,
            "error": job.error,
        }
    )


@router.post("/jobs/{job_id}/retry", response_model=PublishJob)
async def retry_publish_job(
    job_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    job = await publish_service.get_job_by_public_id(db, current_user.internal_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    if job.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")

    task = publish_job_task.delay(job.internal_id)
    job.celery_task_id = task.id
    job.status = "pending"
    job.error = None
    job.result = None
    await db.commit()
    await db.refresh(job)

    account = await publish_service.get_account_by_internal_id(db, current_user.internal_id, job.account_internal_id)
    project_id = await publish_service.resolve_project_public_id(db, job.project_internal_id)
    branch_name = await publish_service.resolve_branch_name(db, job.branch_id)
    return PublishJob.model_validate(
        {
            "id": job.public_id,
            "platform": job.platform,
            "account_id": account.id if account else "",
            "project_id": project_id,
            "branch_name": branch_name,
            "video_url": job.video_url,
            "title": job.title,
            "description": job.description,
            "tags": job.tags,
            "bilibili_tid": job.bilibili_tid,
            "cover_url": job.cover_url,
            "scheduled_publish_at": job.scheduled_publish_at,
            "multi_part": job.multi_part,
            "input_artifacts": job.input_artifacts,
            "attempts": job.attempts,
            "task_id": job.celery_task_id,
            "status": job.status,
            "result": job.result,
            "logs": job.logs,
            "error": job.error,
        }
    )
