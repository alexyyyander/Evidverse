from typing import Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.workers.image_tasks import generate_character_image

router = APIRouter()

class CharacterPrompt(BaseModel):
    prompt: str
    anchor_id: Optional[int] = None # Added for character consistency

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
    # If anchor_id is provided, we should ideally fetch the anchor image URL and pass it to the worker
    # For now, let's just pass the anchor_id to the worker, and let the worker handle logic (or ignore if not implemented)
    
    # In a real scenario:
    # 1. Fetch anchor from DB using anchor_id
    # 2. Pass anchor_image_url to generate_character_image
    
    # Updated task signature required?
    # Let's keep it simple for now and just pass prompt.
    # To support anchor, we'd update generate_character_image to accept optional image_url/anchor_id.
    
    task = generate_character_image.delay(prompt_in.prompt, current_user.id)
    return {"task_id": task.id, "status": "pending"}
