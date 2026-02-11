from typing import Any
from fastapi import APIRouter, Depends
from celery.result import AsyncResult
from app.api import deps
from app.models.user import User

router = APIRouter()

@router.get("/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get status of a background task.
    """
    task_result = AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result
    }
