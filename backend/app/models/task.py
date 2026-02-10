from sqlalchemy import Column, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from app.models.base import Base

class TaskStatus(Base):
    __tablename__ = "task_statuses"

    id = Column(String, primary_key=True, index=True) # Task ID from Celery/External
    task_type = Column(String, nullable=False) # e.g. "video_generation"
    status = Column(String, default="pending") # pending, processing, succeeded, failed
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
