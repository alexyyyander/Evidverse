import uuid

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.models.base import Base


class PublishAccount(Base):
    __tablename__ = "publish_accounts"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform = Column(String, nullable=False, index=True)  # bilibili | douyin
    label = Column(String, nullable=True)

    credential_enc = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status = Column(String, nullable=False, default="active", index=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    @property
    def id(self) -> str:
        return self.public_id


class PublishJob(Base):
    __tablename__ = "publish_jobs"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_internal_id = Column("account_id", Integer, ForeignKey("publish_accounts.id"), nullable=False, index=True)

    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    platform = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    bilibili_tid = Column(Integer, nullable=True)
    cover_url = Column(Text, nullable=True)
    scheduled_publish_at = Column(DateTime(timezone=True), nullable=True)
    multi_part = Column(Boolean, nullable=False, default=False)

    video_url = Column(Text, nullable=False)
    input_artifacts = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    celery_task_id = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="pending", index=True)
    result = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    logs = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    error = Column(Text, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id
