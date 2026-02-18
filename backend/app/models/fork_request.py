import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.models.base import Base


class ForkRequest(Base):
    __tablename__ = "fork_requests"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))

    project_internal_id = Column("project_id", Integer, ForeignKey("projects.id"), nullable=False, index=True)
    requester_internal_id = Column("requester_id", Integer, ForeignKey("users.id"), nullable=False, index=True)
    commit_hash = Column(String, nullable=True)

    status = Column(String, nullable=False, default="pending", index=True)  # pending | approved | rejected | cancelled
    reviewer_internal_id = Column("reviewer_id", Integer, ForeignKey("users.id"), nullable=True, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    approved_project_internal_id = Column("approved_project_id", Integer, ForeignKey("projects.id"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def id(self) -> str:
        return self.public_id
