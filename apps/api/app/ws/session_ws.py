import asyncio

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketState

from app.core.db import SessionLocal
from app.core.redis_client import get_session_state
from app.services.game_engine import load_session_state

router = APIRouter(tags=["ws"])


@router.websocket("/ws/sessions/{session_id}")
async def session_updates(websocket: WebSocket, session_id: int) -> None:
    await websocket.accept()
    last_payload = None

    try:
        while True:
            payload = get_session_state(session_id)
            if payload is None:
                with SessionLocal() as db:
                    state = load_session_state(db, session_id)
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
