import uuid

from sqlalchemy import Column, Integer, String, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base

class Branch(Base):
    __tablename__ = "branches"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    head_commit_id = Column(String, ForeignKey("commits.id"), nullable=True)
    creator_internal_id = Column("creator_id", Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    parent_branch_internal_id = Column("parent_branch_id", Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    workspace_data = Column(JSON, nullable=True)

    project = relationship("Project", back_populates="branches")
    head_commit = relationship("Commit")
    creator = relationship("User", foreign_keys=[creator_internal_id])
    parent_branch = relationship("Branch", remote_side=[internal_id], foreign_keys=[parent_branch_internal_id])

    @property
    def id(self) -> str:
        return self.public_id
