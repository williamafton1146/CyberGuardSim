from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.session import AnswerRequest, AnswerResult, SessionState, StartSessionRequest
from app.services.game_engine import start_session, submit_answer

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionState)
async def create_session(
    payload: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionState:
    return start_session(db, current_user, payload.scenario_slug)


@router.post("/{session_id}/answers", response_model=AnswerResult)
async def answer(
    session_id: int,
    payload: AnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnswerResult:
    return submit_answer(db, current_user, session_id, payload.option_id)
