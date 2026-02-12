from typing import Optional, List
from pydantic import BaseModel

class BranchBase(BaseModel):
    name: str

class BranchCreate(BranchBase):
    pass

class Branch(BranchBase):
    id: str
    project_id: str
    head_commit_id: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_branch_id: Optional[str] = None

    class Config:
        from_attributes = True
