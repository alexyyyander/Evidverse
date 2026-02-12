import uuid

from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    internal_id = Column("id", Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    @property
    def id(self) -> str:
        return self.public_id
