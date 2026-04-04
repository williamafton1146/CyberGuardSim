import asyncio

from fastapi import APIRouter, Query, WebSocket
from starlette.websockets import WebSocketState

from app.core.db import SessionLocal
from app.core.security import decode_access_token
from app.core.redis_client import get_session_state
from app.services.game_engine import load_session_state

router = APIRouter(tags=["ws"])


@router.websocket("/ws/sessions/{session_id}")
async def session_updates(websocket: WebSocket, session_id: int, token: str | None = Query(default=None)) -> None:
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=1008)
        return

    with SessionLocal() as db:
        initial_state = load_session_state(db, session_id, user_id=user_id)

    if initial_state is None:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    last_payload = initial_state.model_dump(mode="json")
    await websocket.send_json(last_payload)

    try:
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED or websocket.application_state == WebSocketState.DISCONNECTED:
                break

            payload = get_session_state(session_id)
            if payload is None:
                with SessionLocal() as db:
                    state = load_session_state(db, session_id, user_id=user_id)
                payload = state.model_dump(mode="json") if state is not None else None

            if payload and payload != last_payload:
                await websocket.send_json(payload)
                last_payload = payload
                if payload.get("status") != "active":
                    break
            await asyncio.sleep(1)
    finally:
        if websocket.application_state != WebSocketState.DISCONNECTED:
            await websocket.close()
