from typing import Any, Optional, List, Dict, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.services.story_service import story_service
from app.utils.url import validate_remote_url
from app.workers.image_tasks import generate_character_image
from app.workers.workflow_tasks import generate_clip_workflow, generate_segment_workflow
from app.workers.comfyui_tasks import run_comfyui_workflow_asset

router = APIRouter()

class ComfyUIBinding(BaseModel):
    node_id: str
    path: str
    param: str

class ComfyUIUpload(BaseModel):
    param: str
    url: str

class ComfyUIWorkflowPrompt(BaseModel):
    workflow: Dict[str, Any]
    bindings: Optional[List[ComfyUIBinding]] = None
    params: Optional[Dict[str, Any]] = None
    uploads: Optional[List[ComfyUIUpload]] = None
    output: Literal["image", "video"] = "image"

class CharacterPrompt(BaseModel):
    prompt: str
    anchor_id: Optional[int] = None # Added for character consistency
    comfyui: Optional[ComfyUIWorkflowPrompt] = None

class ClipPrompt(BaseModel):
    topic: str

class StoryboardPrompt(BaseModel):
    topic: str
    stage: Optional[Literal["step1_story", "step2_outline"]] = None
    llm_provider: Optional[Literal["auto", "ollama", "vllm", "sglang", "openai_compatible"]] = None
    story_mode: Optional[Literal["generate", "create", "edit"]] = None
    story_style: Optional[Literal["record", "science", "series", "short_drama", "animation"]] = None
    tone: Optional[Literal["humorous", "serious", "warm", "cold"]] = None
    script_mode: Optional[Literal["strict_screenplay", "stage_play", "dance_drama", "narrative"]] = None
    segment_length: Optional[Literal["long", "medium", "short"]] = None
    character_seed: Optional[List[Dict[str, Any]]] = None
    existing_outline: Optional[Dict[str, Any]] = None

class StoryboardMeta(BaseModel):
    requested_provider: Literal["auto", "ollama", "vllm", "sglang", "openai_compatible"]
    resolved_provider: Literal["ollama", "vllm", "sglang", "openai_compatible", "cloud"]
    fallback_used: bool
    warnings: List[str] = []


class StoryboardResponse(BaseModel):
    storyboard: List[Dict[str, Any]]
    meta: Optional[StoryboardMeta] = None

class SegmentPrompt(BaseModel):
    narration: str
    visual_description: str
    image_url: Optional[str] = None
    comfyui: Optional[ComfyUIWorkflowPrompt] = None

class GenerationResponse(BaseModel):
    task_id: str
    status: str


def _validate_comfyui_uploads(uploads: Optional[List[ComfyUIUpload]]) -> None:
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

@router.post("/character", response_model=GenerationResponse)
async def generate_character(
    prompt_in: CharacterPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate character image from text prompt.
    """
    if prompt_in.comfyui and isinstance(prompt_in.comfyui.workflow, dict) and prompt_in.comfyui.workflow:
        _validate_comfyui_uploads(prompt_in.comfyui.uploads)
        params = dict(prompt_in.comfyui.params or {})
        if "prompt" not in params:
            params["prompt"] = prompt_in.prompt
        task = run_comfyui_workflow_asset.delay(
            prompt_in.comfyui.workflow,
            [b.model_dump() for b in (prompt_in.comfyui.bindings or [])] if prompt_in.comfyui.bindings else None,
            params,
            [u.model_dump() for u in (prompt_in.comfyui.uploads or [])] if prompt_in.comfyui.uploads else None,
            current_user.internal_id,
        )
        return {"task_id": task.id, "status": "pending"}

    task = generate_character_image.delay(prompt_in.prompt, current_user.internal_id)
    return {"task_id": task.id, "status": "pending"}

@router.post("/clip", response_model=GenerationResponse)
async def generate_clip(
    prompt_in: ClipPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a video clip workflow from topic.
    """
    task = generate_clip_workflow.delay(prompt_in.topic, current_user.internal_id)
    return {"task_id": task.id, "status": "pending"}

@router.post("/storyboard", response_model=StoryboardResponse)
async def generate_storyboard(
    prompt_in: StoryboardPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        payload = await story_service.generate_storyboard(
            prompt_in.topic,
            options={
                "stage": prompt_in.stage,
                "llm_provider": prompt_in.llm_provider,
                "story_mode": prompt_in.story_mode,
                "story_style": prompt_in.story_style,
                "tone": prompt_in.tone,
                "script_mode": prompt_in.script_mode,
                "segment_length": prompt_in.segment_length,
                "character_seed": prompt_in.character_seed,
                "existing_outline": prompt_in.existing_outline,
            },
        )
        if isinstance(payload, dict):
            storyboard = payload.get("storyboard")
            meta = payload.get("meta")
            if isinstance(storyboard, list):
                return {"storyboard": storyboard, "meta": meta}
        if isinstance(payload, list):
            return {"storyboard": payload}
        raise ValueError("Invalid storyboard payload")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

@router.post("/segment", response_model=GenerationResponse)
async def generate_segment(
    prompt_in: SegmentPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if prompt_in.comfyui and isinstance(prompt_in.comfyui.workflow, dict) and prompt_in.comfyui.workflow:
        _validate_comfyui_uploads(prompt_in.comfyui.uploads)
        params = dict(prompt_in.comfyui.params or {})
        if "narration" not in params:
            params["narration"] = prompt_in.narration
        if "visual_description" not in params:
            params["visual_description"] = prompt_in.visual_description
        if prompt_in.image_url and "image_url" not in params:
            params["image_url"] = prompt_in.image_url
        task = run_comfyui_workflow_asset.delay(
            prompt_in.comfyui.workflow,
            [b.model_dump() for b in (prompt_in.comfyui.bindings or [])] if prompt_in.comfyui.bindings else None,
            params,
            [u.model_dump() for u in (prompt_in.comfyui.uploads or [])] if prompt_in.comfyui.uploads else None,
            current_user.internal_id,
        )
        return {"task_id": task.id, "status": "pending"}

    task = generate_segment_workflow.delay(
        prompt_in.narration,
        prompt_in.visual_description,
        current_user.internal_id,
        prompt_in.image_url,
    )
    return {"task_id": task.id, "status": "pending"}


@router.post("/comfyui", response_model=GenerationResponse)
async def generate_with_comfyui(
    req: ComfyUIWorkflowPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    _validate_comfyui_uploads(req.uploads)
    task = run_comfyui_workflow_asset.delay(
        req.workflow,
        [b.model_dump() for b in (req.bindings or [])] if req.bindings else None,
        req.params or {},
        [u.model_dump() for u in (req.uploads or [])] if req.uploads else None,
        current_user.internal_id,
    )
    return {"task_id": task.id, "status": "pending"}
