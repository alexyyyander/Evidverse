from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    workspace_data = Column(JSON, nullable=True) # Uncommitted changes / working copy
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", backref="projects")
    parent_project = relationship("Project", remote_side=[id], backref="forks", foreign_keys=[parent_project_id])
    
    branches = relationship("Branch", back_populates="project", cascade="all, delete-orphan")
    commits = relationship("Commit", back_populates="project", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="project", cascade="all, delete-orphan")
