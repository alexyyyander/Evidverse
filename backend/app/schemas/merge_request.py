from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class MergeRequestCreate(BaseModel):
    source_branch_name: str
    target_branch_name: Optional[str] = "main"
    title: Optional[str] = None
    description: Optional[str] = None
    clip_ids: Optional[list[str]] = None


class MergeRequest(BaseModel):
    id: str
    project_id: str
    source_branch_name: str
    target_branch_name: str
    title: Optional[str] = None
    description: Optional[str] = None
    clip_ids: Optional[list[str]] = None
    merged_clip_ids: Optional[list[str]] = None
    status: str
    merged_by: Optional[str] = None
    merged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    extra: Optional[Any] = None

    class Config:
        from_attributes = True
