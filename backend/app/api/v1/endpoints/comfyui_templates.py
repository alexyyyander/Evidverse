import os
import uuid
from typing import Any, Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.models.comfyui_template import ComfyUITemplate
from app.services.storage_service import storage_service
from app.services.comfyui_service import comfyui_service
from app.utils.url import validate_remote_url
from app.workers.comfyui_tasks import render_comfyui_workflow, run_comfyui_workflow_asset


router = APIRouter()


class Binding(BaseModel):
    node_id: str
    path: str
    param: str


class WorkflowUpload(BaseModel):
    param: str
    url: str


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workflow: Dict[str, Any]
    bindings: Optional[List[Binding]] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    workflow: Dict[str, Any]
    bindings: Optional[List[Binding]] = None


class TemplateSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None


class RenderRequest(BaseModel):
    params: Dict[str, Any]


class WorkflowExecuteRequest(BaseModel):
    workflow: Dict[str, Any]
    bindings: Optional[List[Binding]] = None
    params: Optional[Dict[str, Any]] = None
    uploads: Optional[List[WorkflowUpload]] = None


class TaskStartResponse(BaseModel):
    task_id: str
    status: str


class ComfyUIUploadResponse(BaseModel):
    object_name: str
    storage_url: str
    comfyui_image: str
    content_type: Optional[str] = None
    filename: str


def _validate_workflow_uploads(uploads: Optional[List[WorkflowUpload]]) -> None:
    for idx, upload in enumerate(uploads or []):
        try:
            validate_remote_url(
                str(upload.url or "").strip(),
                allowed_schemes=("http", "https"),
                allowed_hosts=settings.COMFYUI_UPLOAD_ALLOWED_HOSTS,
                allow_private_network=bool(settings.COMFYUI_UPLOAD_ALLOW_PRIVATE_HOSTS),
                allow_local_file=False,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid uploads[{idx}].url: {e}")


@router.get("/health")
async def health(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    return await comfyui_service.health()


@router.get("/object-info")
async def object_info(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        return await comfyui_service.get_object_info()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/object-info/{node_class}")
async def object_info_by_node(
    node_class: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        return await comfyui_service.get_object_info(node_class=node_class)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/system-stats")
async def system_stats(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        return await comfyui_service.get_system_stats()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/queue")
async def queue_info(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        return await comfyui_service.get_queue()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/upload-image", response_model=ComfyUIUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    overwrite: bool = False,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="file is empty")

    filename = os.path.basename(file.filename or "upload.bin")
    content_type = file.content_type or "application/octet-stream"

    try:
        comfyui_data = await comfyui_service.upload_image(
            file_bytes=raw,
            filename=filename,
            content_type=content_type,
            overwrite=overwrite,
            image_type="input",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    object_name = f"comfyui_uploads/{current_user.internal_id}/{uuid.uuid4().hex}_{filename}"
    if not storage_service.upload_file(raw, object_name):
        raise HTTPException(status_code=500, detail="Failed to upload to storage")

    storage_url = f"{str(settings.S3_ENDPOINT_URL).rstrip('/')}/{settings.S3_BUCKET_NAME}/{object_name}"
    comfyui_name = str(comfyui_data.get("name") or "").strip()
    subfolder = str(comfyui_data.get("subfolder") or "").strip()
    if subfolder and comfyui_name:
        comfyui_name = f"{subfolder}/{comfyui_name}"
    if not comfyui_name:
        raise HTTPException(status_code=502, detail="ComfyUI upload response missing filename")

    return {
        "object_name": object_name,
        "storage_url": storage_url,
        "comfyui_image": comfyui_name,
        "content_type": content_type,
        "filename": filename,
    }


@router.post("/workflows/execute", response_model=TaskStartResponse)
async def execute_workflow(
    body: WorkflowExecuteRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if not isinstance(body.workflow, dict) or not body.workflow:
        raise HTTPException(status_code=400, detail="workflow must be a non-empty object")
    _validate_workflow_uploads(body.uploads)

    task = run_comfyui_workflow_asset.delay(
        body.workflow,
        [b.model_dump() for b in (body.bindings or [])] if body.bindings else None,
        body.params or {},
        [u.model_dump() for u in (body.uploads or [])] if body.uploads else None,
        current_user.internal_id,
    )
    return {"task_id": task.id, "status": "pending"}


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    template_in: TemplateCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if not isinstance(template_in.workflow, dict) or not template_in.workflow:
        raise HTTPException(status_code=400, detail="workflow must be a non-empty object")

    db_t = ComfyUITemplate(
        name=template_in.name,
        description=template_in.description,
        workflow=template_in.workflow,
        bindings=[b.model_dump() for b in (template_in.bindings or [])] if template_in.bindings else None,
        owner_internal_id=current_user.internal_id,
    )
    db.add(db_t)
    await db.commit()
    await db.refresh(db_t)
    return TemplateResponse.model_validate(
        {
            "id": db_t.public_id,
            "name": db_t.name,
            "description": db_t.description,
            "workflow": db_t.workflow,
            "bindings": db_t.bindings,
        }
    )


@router.get("/templates", response_model=List[TemplateSummary])
async def list_templates(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = (
        select(ComfyUITemplate)
        .where(ComfyUITemplate.owner_internal_id == current_user.internal_id)
        .order_by(ComfyUITemplate.created_at.desc())
    )
    res = await db.execute(q)
    items = res.scalars().all()
    return [
        TemplateSummary.model_validate({"id": t.public_id, "name": t.name, "description": t.description})
        for t in items
    ]


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = select(ComfyUITemplate).where(ComfyUITemplate.public_id == template_id)
    res = await db.execute(q)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return TemplateResponse.model_validate(
        {
            "id": t.public_id,
            "name": t.name,
            "description": t.description,
            "workflow": t.workflow,
            "bindings": t.bindings,
        }
    )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = select(ComfyUITemplate).where(ComfyUITemplate.public_id == template_id)
    res = await db.execute(q)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    await db.execute(delete(ComfyUITemplate).where(ComfyUITemplate.internal_id == t.internal_id))
    await db.commit()
    return {"ok": True}


@router.post("/templates/{template_id}/render", response_model=TaskStartResponse)
async def render_template(
    template_id: str,
    req: RenderRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    q = select(ComfyUITemplate).where(ComfyUITemplate.public_id == template_id)
    res = await db.execute(q)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.owner_internal_id != current_user.internal_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    task = render_comfyui_workflow.delay(t.workflow, t.bindings, req.params, current_user.internal_id)
    return {"task_id": task.id, "status": "pending"}
