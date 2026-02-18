import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
import uuid
import os
import asyncio
import fnmatch
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:").strip()
os.environ["TEST_DATABASE_URL"] = TEST_DATABASE_URL

from app.core.db import get_db
from app.models.base import Base
from app.main import app
from httpx import AsyncClient, ASGITransport
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function", autouse=True)
async def event_loop_heartbeat():
    stop = asyncio.Event()

    async def _heartbeat():
        while not stop.is_set():
            await asyncio.sleep(0.01)

    task = asyncio.create_task(_heartbeat())
    try:
        yield
    finally:
        stop.set()
        await task

@pytest.fixture(scope="function", autouse=True)
async def close_cache_connections():
    yield
    try:
        from app.core.cache import cache

        await cache.redis.aclose(close_connection_pool=True)
        await cache.redis.connection_pool.disconnect(inuse_connections=True)
    except Exception:
        pass

@pytest.fixture(scope="function", autouse=True)
def use_in_memory_cache(monkeypatch):
    from app.core.cache import cache

    async def _get(key: str):
        value = cache._mem.get(key)
        return json.loads(value) if value else None

    async def _set(key: str, value, expire: int = 300):
        cache._mem[key] = json.dumps(value)

    async def _delete(key: str):
        cache._mem.pop(key, None)

    async def _delete_pattern(pattern: str):
        for k in list(cache._mem.keys()):
            if fnmatch.fnmatch(k, pattern):
                cache._mem.pop(k, None)

    monkeypatch.setattr(cache, "get", _get)
    monkeypatch.setattr(cache, "set", _set)
    monkeypatch.setattr(cache, "delete", _delete)
    monkeypatch.setattr(cache, "delete_pattern", _delete_pattern)

@pytest.fixture(scope="session", autouse=True)
def disable_vn_parse_job_celery_delay():
    from app.workers.vn_tasks import vn_parse_job as vn_parse_job_task

    original_delay = vn_parse_job_task.delay

    def fake_delay(*args, **kwargs):
        class DummyResult:
            id = f"test-task-{uuid.uuid4().hex}"

        return DummyResult()

    vn_parse_job_task.delay = fake_delay
    yield
    vn_parse_job_task.delay = original_delay

@pytest.fixture(scope="function")
async def db_engine(event_loop_heartbeat):
    connect_args = {"check_same_thread": False} if TEST_DATABASE_URL.startswith("sqlite") else {}
    engine = create_async_engine(TEST_DATABASE_URL, connect_args=connect_args)
    
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
        email=f"test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash(password),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def normal_user_token_headers(normal_user):
    access_token = create_access_token(subject=normal_user.internal_id)
    return {"Authorization": f"Bearer {access_token}"}
