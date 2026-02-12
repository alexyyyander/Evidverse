import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.models.base import Base


class MergeRequest(Base):
    __tablename__ = "merge_requests"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    creator_internal_id = Column("creator_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=False, index=True)

    source_branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    target_branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    clip_ids = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    merged_clip_ids = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    status = Column(String, nullable=False, default="open", index=True)
    merged_by_internal_id = Column("merged_by", Integer, ForeignKey("users.id"), nullable=True, index=True)
    merged_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id
