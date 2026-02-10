from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class CharacterAnchor(Base):
    __tablename__ = "character_anchors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    reference_image_url = Column(String, nullable=False) # S3 URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="anchors")
