from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserPublic

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    description: Optional[str] = None
    workspace_data: Optional[dict] = None # JSON
    is_public: Optional[bool] = None

class ProjectFork(BaseModel):
    commit_hash: Optional[str] = None

class Project(ProjectBase):
    id: int
    owner_id: int
    parent_project_id: Optional[int] = None
    created_at: datetime
    workspace_data: Optional[dict] = None
    likes_count: int = 0
    is_liked: bool = False

    class Config:
        from_attributes = True

class ProjectFeedItem(Project):
    owner: Optional[UserPublic] = None
