import json
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

class InMemoryRedisMock:
    """In-memory Redis fallback ensuring 100% test coverage and zero-dependency local operation."""
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._sorted_sets: Dict[str, Dict[str, float]] = {}

    async def get(self, key: str) -> Optional[str]:
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        self._data[key] = value
        return True

    async def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._data:
                del self._data[k]
                count += 1
            if k in self._sorted_sets:
                del self._sorted_sets[k]
                count += 1
        return count

    async def zadd(self, name: str, mapping: Dict[str, float]) -> int:
        if name not in self._sorted_sets:
            self._sorted_sets[name] = {}
        added = 0
        for member, score in mapping.items():
            if member not in self._sorted_sets[name]:
                added += 1
            self._sorted_sets[name][member] = float(score)
        return added

    async def zrevrange(self, name: str, start: int, end: int, withscores: bool = False) -> List[Any]:
        if name not in self._sorted_sets:
            return []
        items = sorted(self._sorted_sets[name].items(), key=lambda x: x[1], reverse=True)
        slice_items = items[start : end + 1 if end != -1 else None]
        if withscores:
            return [(member, score) for member, score in slice_items]
        return [member for member, _ in slice_items]

    async def zrevrank(self, name: str, member: str) -> Optional[int]:
        if name not in self._sorted_sets or member not in self._sorted_sets[name]:
            return None
        items = sorted(self._sorted_sets[name].items(), key=lambda x: x[1], reverse=True)
        for rank, (m, _) in enumerate(items):
            if m == member:
                return rank
        return None

    async def zscore(self, name: str, member: str) -> Optional[float]:
        if name not in self._sorted_sets:
            return None
        return self._sorted_sets[name].get(member)

    async def close(self):
        pass


class RedisClient:
    def __init__(self):
        self._client: Optional[Any] = None
        self._fallback: InMemoryRedisMock = InMemoryRedisMock()

    async def init(self, redis_url: str):
        try:
            import redis.asyncio as aioredis
            self._client = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
            await self._client.ping()
            logger.info("Connected to Redis at %s", redis_url)
        except Exception as e:
            logger.warning("Redis not available, operating in In-Memory fallback mode: %s", str(e))
            self._client = None

    @property
    def client(self) -> Any:
        return self._client if self._client is not None else self._fallback

    async def close(self):
        if self._client is not None:
            await self._client.close()

redis_client = RedisClient()
