from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
import datetime
import os
from app.core.config import settings

database_url = os.getenv("TEST_DATABASE_URL") or str(settings.SQLALCHEMY_DATABASE_URI)
engine = create_async_engine(database_url, echo=True)

if engine.url.get_backend_name() == "sqlite":
    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_register_now(dbapi_connection, _connection_record):
        try:
            dbapi_connection.create_function(
                "now",
                0,
                lambda: datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            )
        except Exception:
            pass
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
