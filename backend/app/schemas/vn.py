from datetime import datetime
from typing import Any, Optional, Literal

from pydantic import BaseModel


VNAssetType = Literal["SCREENSHOT", "VN_SCRIPT", "VN_TEXT", "VN_JSON", "CHARACTER_SHEET", "OTHER"]


class VNAssetCreate(BaseModel):
    project_id: str
    branch_name: Optional[str] = None
    type: VNAssetType
    object_name: str
    metadata: Optional[Any] = None


class VNAsset(BaseModel):
    id: str
    project_id: str
    branch_name: Optional[str] = None
    type: VNAssetType
    object_name: str
    storage_url: str
    metadata: Optional[Any] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


VNEngine = Literal["KIRIKIRI", "RENPY"]


class VNParsePreviewRequest(BaseModel):
    engine: VNEngine
    script_text: str


class VNParsePreviewResponse(BaseModel):
    engine: VNEngine
    events: list[dict[str, Any]]


class VNParseJobCreate(BaseModel):
    project_id: str
    branch_name: Optional[str] = None
    engine: VNEngine
    script_text: Optional[str] = None
    asset_ids: Optional[list[str]] = None


class VNParseJob(BaseModel):
    id: str
    project_id: str
    branch_name: Optional[str] = None
    engine: Optional[str] = None
    status: str
    task_id: Optional[str] = None
    attempts: Optional[int] = None
    result: Optional[Any] = None
    logs: Optional[Any] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True
