import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    """Get or initialize singleton Redis client."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            encoding="utf-8",
        )
    return redis_client


async def close_redis_client() -> None:
    """Close Redis client connection pool."""
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None
