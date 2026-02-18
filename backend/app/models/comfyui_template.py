import uuid

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.models.base import Base


class ComfyUITemplate(Base):
    __tablename__ = "comfyui_templates"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    workflow = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    bindings = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def id(self) -> str:
        return self.public_id

