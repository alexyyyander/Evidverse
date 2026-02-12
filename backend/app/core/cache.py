import redis.asyncio as redis
import json
from typing import Optional, Any
import fnmatch
from app.core.config import settings

class RedisCache:
    def __init__(self):
        self.redis = redis.from_url(settings.CELERY_RESULT_BACKEND, encoding="utf-8", decode_responses=True)
        self._mem: dict[str, str] = {}

    async def get(self, key: str) -> Optional[Any]:
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception:
            value = self._mem.get(key)
            return json.loads(value) if value else None

    async def set(self, key: str, value: Any, expire: int = 300):
        payload = json.dumps(value)
        try:
            await self.redis.set(key, payload, ex=expire)
        except Exception:
            self._mem[key] = payload

    async def delete(self, key: str):
        try:
            await self.redis.delete(key)
        except Exception:
            self._mem.pop(key, None)

    async def delete_pattern(self, pattern: str):
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
        except Exception:
            for k in list(self._mem.keys()):
                if fnmatch.fnmatch(k, pattern):
                    self._mem.pop(k, None)

cache = RedisCache()
