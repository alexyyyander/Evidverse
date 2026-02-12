from datetime import datetime
from typing import Optional, Any, List, Literal

from pydantic import BaseModel


PublishPlatform = Literal["bilibili", "douyin"]


class PublishAccountCreate(BaseModel):
    platform: PublishPlatform
    label: Optional[str] = None
    credential_json: str


class PublishAccount(BaseModel):
    id: str
    platform: PublishPlatform
    label: Optional[str] = None
    status: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    last_error: Optional[str] = None

    class Config:
        from_attributes = True


class PublishJobCreate(BaseModel):
    account_id: str
    project_id: Optional[str] = None
    branch_name: Optional[str] = "main"
    video_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    bilibili_tid: Optional[int] = None
    cover_url: Optional[str] = None
    scheduled_publish_at: Optional[datetime] = None
    multi_part: Optional[bool] = False


class PublishJob(BaseModel):
    id: str
    platform: PublishPlatform
    account_id: str
    project_id: Optional[str] = None
    branch_name: Optional[str] = None
    video_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    bilibili_tid: Optional[int] = None
    cover_url: Optional[str] = None
    scheduled_publish_at: Optional[datetime] = None
    multi_part: Optional[bool] = None
    input_artifacts: Optional[Any] = None
    attempts: Optional[int] = None
    task_id: Optional[str] = None
    status: str
    result: Optional[Any] = None
    logs: Optional[Any] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True
