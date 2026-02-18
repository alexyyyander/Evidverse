import asyncio
import fnmatch
import json
from typing import Any, Optional

import redis.asyncio as redis
from app.core.config import settings

class RedisCache:
    def __init__(self):
        # Keep Redis operations fail-fast so API/test flow never blocks on cache availability.
        self._op_timeout = 0.5
        self.redis = redis.from_url(
            settings.CELERY_RESULT_BACKEND,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=self._op_timeout,
            socket_timeout=self._op_timeout,
            retry_on_timeout=False,
        )
        self._mem: dict[str, str] = {}

    async def get(self, key: str) -> Optional[Any]:
        try:
            value = await asyncio.wait_for(self.redis.get(key), timeout=self._op_timeout)
            if value:
                return json.loads(value)
            return None
        except Exception:
            value = self._mem.get(key)
            return json.loads(value) if value else None

    async def set(self, key: str, value: Any, expire: int = 300):
        payload = json.dumps(value)
        try:
            await asyncio.wait_for(self.redis.set(key, payload, ex=expire), timeout=self._op_timeout)
        except Exception:
            self._mem[key] = payload

    async def delete(self, key: str):
        try:
            await asyncio.wait_for(self.redis.delete(key), timeout=self._op_timeout)
        except Exception:
            self._mem.pop(key, None)

    async def delete_pattern(self, pattern: str):
        try:
            keys = await asyncio.wait_for(self.redis.keys(pattern), timeout=self._op_timeout)
            if keys:
                await asyncio.wait_for(self.redis.delete(*keys), timeout=self._op_timeout)
        except Exception:
            for k in list(self._mem.keys()):
                if fnmatch.fnmatch(k, pattern):
                    self._mem.pop(k, None)

cache = RedisCache()
