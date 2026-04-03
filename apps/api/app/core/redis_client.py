import json
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from app.core.config import settings

SESSION_TTL_SECONDS = 60 * 60 * 4
LEADERBOARD_KEY = "leaderboard:top"

_client: Redis | None = None


def get_redis() -> Redis | None:
    global _client
    if _client is not None:
        return _client

    try:
        _client = Redis.from_url(settings.redis_url, decode_responses=True)
        _client.ping()
        return _client
    except RedisError:
        _client = None
        return None


def set_json(key: str, payload: Any, ttl: int | None = None) -> None:
    client = get_redis()
    if client is None:
        return

    try:
        client.set(key, json.dumps(payload), ex=ttl)
    except RedisError:
        return


def get_json(key: str) -> Any | None:
    client = get_redis()
    if client is None:
        return None

    try:
        raw = client.get(key)
    except RedisError:
        return None

    if raw is None:
        return None
    return json.loads(raw)


def set_session_state(session_id: int, payload: dict[str, Any]) -> None:
    set_json(f"session:{session_id}:state", payload, ttl=SESSION_TTL_SECONDS)


def get_session_state(session_id: int) -> dict[str, Any] | None:
    value = get_json(f"session:{session_id}:state")
    return value if isinstance(value, dict) else None


def clear_session_state(session_id: int) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        client.delete(f"session:{session_id}:state")
    except RedisError:
        return


def delete_key(key: str) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        client.delete(key)
    except RedisError:
        return
