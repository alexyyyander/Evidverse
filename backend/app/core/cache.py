import redis.asyncio as redis
import json
from typing import Optional, Any
from app.core.config import settings

class RedisCache:
    def __init__(self):
        self.redis = redis.from_url(settings.CELERY_RESULT_BACKEND, encoding="utf-8", decode_responses=True)

    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None

    async def set(self, key: str, value: Any, expire: int = 300):
        await self.redis.set(key, json.dumps(value), ex=expire)

    async def delete(self, key: str):
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str):
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

cache = RedisCache()
