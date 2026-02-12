from typing import Any, Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.services.story_service import story_service
from app.workers.image_tasks import generate_character_image
from app.workers.workflow_tasks import generate_clip_workflow, generate_segment_workflow

router = APIRouter()

class CharacterPrompt(BaseModel):
    prompt: str
    anchor_id: Optional[int] = None # Added for character consistency

class ClipPrompt(BaseModel):
    topic: str

class StoryboardPrompt(BaseModel):
    topic: str

class StoryboardResponse(BaseModel):
    storyboard: List[Dict[str, Any]]

class SegmentPrompt(BaseModel):
    narration: str
    visual_description: str
    image_url: Optional[str] = None

class GenerationResponse(BaseModel):
    task_id: str
    status: str

@router.post("/character", response_model=GenerationResponse)
async def generate_character(
    prompt_in: CharacterPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate character image from text prompt.
    """
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
        storyboard = await story_service.generate_storyboard(prompt_in.topic)
        return {"storyboard": storyboard}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

@router.post("/segment", response_model=GenerationResponse)
async def generate_segment(
    prompt_in: SegmentPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    task = generate_segment_workflow.delay(
        prompt_in.narration,
        prompt_in.visual_description,
        current_user.internal_id,
        prompt_in.image_url,
    )
    return {"task_id": task.id, "status": "pending"}
