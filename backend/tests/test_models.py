import pytest
from sqlalchemy import select
from app.models.user import User
from app.models.project import Project

@pytest.mark.asyncio
async def test_create_user(db_session):
    new_user = User(email="test@example.com", hashed_password="hashed_secret")
    db_session.add(new_user)
    await db_session.commit()
    await db_session.refresh(new_user)
    
    assert new_user.id is not None
    assert new_user.email == "test@example.com"
    
    stmt = select(User).where(User.email == "test@example.com")
    result = await db_session.execute(stmt)
    user_in_db = result.scalar_one_or_none()
    assert user_in_db is not None
    assert user_in_db.email == "test@example.com"

@pytest.mark.asyncio
async def test_create_project(db_session):
    # Create owner first
    owner = User(email="owner@example.com", hashed_password="hashed")
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)
    
    # Create project
    new_project = Project(name="Test Project", owner_id=owner.id)
    db_session.add(new_project)
    await db_session.commit()
    await db_session.refresh(new_project)
    
    assert new_project.id is not None
    assert new_project.name == "Test Project"
    assert new_project.owner_id == owner.id
