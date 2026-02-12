import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.models.base import Base


class VNAsset(Base):
    __tablename__ = "vn_assets"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    type = Column(String, nullable=False, index=True)
    object_name = Column(String, nullable=False)
    storage_url = Column(Text, nullable=False)
    meta = Column("metadata", JSON().with_variant(JSONB, "postgresql"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id


class VNParseJob(Base):
    __tablename__ = "vn_parse_jobs"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    engine_hint = Column(String, nullable=True, index=True)
    inputs = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)

    status = Column(String, nullable=False, default="pending", index=True)
    result = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    error = Column(Text, nullable=True)
    logs = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id
