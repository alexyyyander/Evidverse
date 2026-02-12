import uuid

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Project(Base):
    __tablename__ = "projects"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    workspace_data = Column(JSON, nullable=True) # Uncommitted changes / working copy
    tags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    owner_internal_id = Column("owner_id", Integer, ForeignKey("users.id"), nullable=False)
    parent_project_internal_id = Column("parent_project_id", Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", backref="projects")
    parent_project = relationship(
        "Project",
        remote_side=[internal_id],
        backref="forks",
        foreign_keys=[parent_project_internal_id],
    )
    
    branches = relationship("Branch", back_populates="project", cascade="all, delete-orphan")
    commits = relationship("Commit", back_populates="project", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="project", cascade="all, delete-orphan")

    @property
    def id(self) -> str:
        return self.public_id

    @property
    def owner_id(self) -> str | None:
        return getattr(self.owner, "public_id", None)

    @property
    def parent_project_id(self) -> str | None:
        return getattr(self.parent_project, "public_id", None)
