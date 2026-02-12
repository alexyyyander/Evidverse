from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.models.vn import VNAsset
from app.schemas.vn import VNAsset as VNAssetSchema, VNAssetCreate, VNParsePreviewRequest, VNParsePreviewResponse
from app.services.publish_service import publish_service


router = APIRouter()


def _public_storage_url(object_name: str) -> str:
    base = str(settings.S3_ENDPOINT_URL).rstrip("/")
    return f"{base}/{settings.S3_BUCKET_NAME}/{object_name.lstrip('/')}"


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


def _parse_renpy(text: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    lines = text.splitlines()
    in_menu = False
    current_choices: list[dict[str, Any]] = []

    def flush_menu() -> None:
        nonlocal in_menu, current_choices
        if current_choices:
            events.append({"type": "CHOICE", "choices": current_choices})
        in_menu = False
        current_choices = []

    for raw in lines:
        line = raw.rstrip("\n")
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("label ") and stripped.endswith(":"):
            flush_menu()
            name = stripped[len("label ") : -1].strip()
            events.append({"type": "LABEL", "name": name})
            continue

        if stripped == "menu:":
            flush_menu()
            in_menu = True
            continue

        if in_menu:
            if stripped.startswith('"') and stripped.endswith('":'):
                opt = stripped[1:-2]
                current_choices.append({"text": opt})
                continue
            if not line.startswith((" ", "\t")):
                flush_menu()

        if stripped.startswith("jump "):
            flush_menu()
            target = stripped[len("jump ") :].strip()
            events.append({"type": "JUMP", "target": target})
            continue

        if stripped.startswith('"') and stripped.endswith('"') and len(stripped) >= 2:
            flush_menu()
            events.append({"type": "NARRATION", "text": stripped[1:-1]})
            continue

        if '"' in stripped:
            prefix, rest = stripped.split('"', 1)
            speaker = prefix.strip()
            if rest.endswith('"'):
                text_content = rest[:-1]
                flush_menu()
                if speaker:
                    events.append({"type": "SAY", "speaker": speaker, "text": text_content})
                    continue

    flush_menu()
    return events


def _parse_kirikiri(text: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith(";"):
            continue
        if stripped.startswith("*"):
            events.append({"type": "LABEL", "name": stripped[1:].strip()})
            continue
        if stripped.startswith("@say "):
            payload = stripped[len("@say ") :].strip()
            parts = payload.split(" ", 1)
            if len(parts) == 2:
                speaker = parts[0].strip()
                text_content = parts[1].strip()
                events.append({"type": "SAY", "speaker": speaker, "text": text_content})
            else:
                events.append({"type": "NARRATION", "text": payload})
            continue
        if stripped.startswith("@jump "):
            events.append({"type": "JUMP", "target": stripped[len("@jump ") :].strip()})
            continue
        events.append({"type": "TEXT", "text": stripped})
    return events


@router.post("/parse-preview", response_model=VNParsePreviewResponse)
async def parse_preview(
    body: VNParsePreviewRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    text = (body.script_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="script_text is required")

    if body.engine == "RENPY":
        events = _parse_renpy(text)
    elif body.engine == "KIRIKIRI":
        events = _parse_kirikiri(text)
    else:
        raise HTTPException(status_code=400, detail="Unsupported engine")

    return {"engine": body.engine, "events": events}
