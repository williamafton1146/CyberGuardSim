from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry
from app.services.game_engine import build_leaderboard

router = APIRouter(tags=["leaderboard"])


@router.get("/api/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[LeaderboardEntry]:
    return build_leaderboard(db)
