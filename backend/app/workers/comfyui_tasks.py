import asyncio
import uuid
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.storage_service import storage_service
from app.utils.url import read_bytes_from_url

from ai_engine.models.config import settings as ai_settings
from ai_engine.local.comfyui_template import apply_bindings
from ai_engine.local.workflow_runner import ComfyUIWorkflowRunner


def _public_storage_url(object_name: str) -> str:
    base = str(settings.S3_ENDPOINT_URL).rstrip("/")
    return f"{base}/{settings.S3_BUCKET_NAME}/{object_name}"


def _guess_media_kind(filename: str, bucket: str | None = None) -> str:
    lower = (filename or "").lower()
    ext = Path(lower).suffix
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}:
        return "image"
    if ext in {".mp4", ".mov", ".webm", ".mkv", ".avi"}:
        return "video"
    if ext in {".mp3", ".wav", ".flac", ".ogg", ".aac"}:
        return "audio"
    b = (bucket or "").lower()
    if b in {"images"}:
        return "image"
    if b in {"videos", "gifs"}:
        return "video"
    if b in {"audio"}:
        return "audio"
    return "file"


def _upload_filename(param: str, source_url: str) -> str:
    suffix = Path(urlparse(source_url).path).suffix or ".bin"
    base = (param or "input").strip() or "input"
    safe_base = "".join(ch for ch in base if ch.isalnum() or ch in {"-", "_", "."}) or "input"
    return f"{safe_base}{suffix}"


def _run_loop(coro: Any) -> Any:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _pack_outputs(items: List[tuple[Dict[str, Any], bytes]], user_id: int) -> dict:
    if not items:
        return {"status": "failed", "error": "No files found in workflow outputs"}

    outputs: list[dict[str, Any]] = []
    for info, content in items:
        filename = str(info.get("filename") or "").strip() or "output.bin"
        bucket = str(info.get("_bucket") or "").strip() or None
        ext = Path(filename).suffix or ".bin"
        object_name = f"generated/{user_id}/{uuid.uuid4()}{ext}"
        success = storage_service.upload_file(content, object_name)
        if not success:
            return {"status": "failed", "error": "Failed to upload to storage"}

        media_kind = _guess_media_kind(filename, bucket)
        outputs.append(
            {
                "filename": filename,
                "object_name": object_name,
                "output_url": _public_storage_url(object_name),
                "comfyui_type": info.get("type"),
                "comfyui_bucket": bucket,
                "media_kind": media_kind,
            }
        )

    first = outputs[0]
    result: dict[str, Any] = {
        "status": "succeeded",
        "outputs": outputs,
        "output_url": first["output_url"],
        "object_name": first["object_name"],
        "filename": first["filename"],
        "media_kind": first["media_kind"],
    }

    first_image = next((x for x in outputs if x.get("media_kind") == "image"), None)
    if first_image:
        result["image_url"] = first_image["output_url"]
    first_video = next((x for x in outputs if x.get("media_kind") == "video"), None)
    if first_video:
        result["video_url"] = first_video["output_url"]
    return result


@celery_app.task
def render_comfyui_workflow(workflow: Dict[str, Any], bindings: List[Dict[str, Any]] | None, params: Dict[str, Any], user_id: int) -> dict:
    async def _process():
        try:
            if not ai_settings.USE_LOCAL_MODELS:
                return {"status": "failed", "error": "USE_LOCAL_MODELS is disabled"}

            wf = apply_bindings(workflow=workflow, bindings=bindings, params=params or {})
            runner = ComfyUIWorkflowRunner(host=ai_settings.COMFYUI_HOST)
            items = runner.execute_prompt_files(wf, force_new=True)
            return _pack_outputs(items, user_id=user_id)
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    return _run_loop(_process())


@celery_app.task
def run_comfyui_workflow_asset(
    workflow: Dict[str, Any],
    bindings: List[Dict[str, Any]] | None,
    params: Dict[str, Any] | None,
    uploads: List[Dict[str, Any]] | None,
    user_id: int,
) -> dict:
    async def _process():
        try:
            if not ai_settings.USE_LOCAL_MODELS:
                return {"status": "failed", "error": "USE_LOCAL_MODELS is disabled"}

            runner = ComfyUIWorkflowRunner(host=ai_settings.COMFYUI_HOST)
            p = dict(params or {})
            for u in uploads or []:
                param = str(u.get("param") or "").strip()
                url = str(u.get("url") or "").strip()
                if not param or not url:
                    continue
                image_bytes = read_bytes_from_url(
                    url,
                    timeout=int(settings.COMFYUI_UPLOAD_FETCH_TIMEOUT_SECONDS),
                    max_bytes=int(settings.COMFYUI_UPLOAD_MAX_BYTES),
                    allowed_schemes=("http", "https"),
                    allowed_hosts=settings.COMFYUI_UPLOAD_ALLOWED_HOSTS,
                    allow_private_network=bool(settings.COMFYUI_UPLOAD_ALLOW_PRIVATE_HOSTS),
                    allow_local_file=False,
                )
                uploaded_name = runner.upload_image_bytes(image_bytes, filename=_upload_filename(param, url))
                p[param] = uploaded_name

            wf = apply_bindings(workflow=workflow, bindings=bindings, params=p)
            items = runner.execute_prompt_files(wf, force_new=True)
            result = _pack_outputs(items, user_id=user_id)
            if result.get("status") != "succeeded":
                return result
            result["resolved_params"] = p
            return result
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    return _run_loop(_process())
