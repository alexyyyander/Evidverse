import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.models.base import Base


class ClipSegment(Base):
    __tablename__ = "clip_segments"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    title = Column(String, nullable=True)
    summary = Column(Text, nullable=True)

    input_artifacts = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    assets_ref = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    celery_task_id = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="pending", index=True)
    result = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id
