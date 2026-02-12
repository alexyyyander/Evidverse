from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ClipSegmentCreate(BaseModel):
    project_id: str
    branch_name: Optional[str] = "main"
    title: Optional[str] = None
    summary: Optional[str] = None
    screenshot_asset_ids: list[str]
    prompt: Optional[str] = None


class ClipSegment(BaseModel):
    id: str
    project_id: str
    branch_name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    input_artifacts: Optional[Any] = None
    assets_ref: Optional[Any] = None
    task_id: Optional[str] = None
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
