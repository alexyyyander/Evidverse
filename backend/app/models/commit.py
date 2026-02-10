from sqlalchemy import Column, String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Commit(Base):
    __tablename__ = "commits"

    id = Column(String, primary_key=True, index=True) # SHA hash
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    message = Column(String, nullable=False)
    parent_hash = Column(String, ForeignKey("commits.id"), nullable=True)
    video_url = Column(String, nullable=True) # URL to generated video
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="commits")
    parent = relationship("Commit", remote_side=[id], backref="children")
