from typing import Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.workers.image_tasks import generate_character_image
from app.workers.workflow_tasks import generate_clip_workflow

router = APIRouter()

class CharacterPrompt(BaseModel):
    prompt: str
    anchor_id: Optional[int] = None # Added for character consistency

class ClipPrompt(BaseModel):
    topic: str

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
    task = generate_character_image.delay(prompt_in.prompt, current_user.id)
    return {"task_id": task.id, "status": "pending"}

@router.post("/clip", response_model=GenerationResponse)
async def generate_clip(
    prompt_in: ClipPrompt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a video clip workflow from topic.
    """
    task = generate_clip_workflow.delay(prompt_in.topic, current_user.id)
    return {"task_id": task.id, "status": "pending"}
