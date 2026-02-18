from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserPublic

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: bool = False

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    description: Optional[str] = None
    workspace_data: Optional[dict] = None # JSON
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class ProjectFork(BaseModel):
    commit_hash: Optional[str] = None

class ProjectDeleteConfirm(BaseModel):
    confirm_project_id: str
    confirm_nickname: str

class Project(ProjectBase):
    id: str
    owner_id: str
    parent_project_id: Optional[str] = None
    participated_branch_names: Optional[List[str]] = None
    created_at: datetime
    workspace_data: Optional[dict] = None
    likes_count: int = 0
    is_liked: bool = False

    class Config:
        from_attributes = True

class ProjectFeedItem(Project):
    owner: Optional[UserPublic] = None


class ProjectExportSource(BaseModel):
    cloud_project_id: str
    cloud_branch_name: str
    cloud_origin: Optional[str] = None


class ProjectExportProject(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class ProjectExportBranch(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    workspace_data: Optional[Dict[str, Any]] = None


class ProjectExportHeadCommit(BaseModel):
    message: Optional[str] = None
    video_assets: Optional[Dict[str, Any]] = None


class ProjectExportPayload(BaseModel):
    source: ProjectExportSource
    project: ProjectExportProject
    branch: ProjectExportBranch
    head_commit: Optional[ProjectExportHeadCommit] = None
