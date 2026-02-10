from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    head_commit_id = Column(String, ForeignKey("commits.id"), nullable=True)

    project = relationship("Project", back_populates="branches")
    head_commit = relationship("Commit")
