import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.db import get_db
from app.models.base import Base
from app.main import app
from httpx import AsyncClient, ASGITransport
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

# Use in-memory SQLite for testing to avoid external dependencies
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(scope="function")
async def db_session(db_engine):
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

@pytest.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
async def normal_user(db_session):
    password = "testpassword"
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash(password),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def normal_user_token_headers(normal_user):
    access_token = create_access_token(subject=normal_user.id)
    return {"Authorization": f"Bearer {access_token}"}
