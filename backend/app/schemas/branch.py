from typing import Optional
from pydantic import BaseModel

class BranchBase(BaseModel):
    name: str

class BranchCreate(BranchBase):
    pass

class Branch(BranchBase):
    id: int
    project_id: int
    head_commit_id: Optional[str] = None

    class Config:
        from_attributes = True
