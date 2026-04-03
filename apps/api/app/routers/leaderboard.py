from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.leaderboard import LeaderboardEntry
from app.services.game_engine import build_leaderboard

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
async def leaderboard(db: Session = Depends(get_db)) -> list[LeaderboardEntry]:
    return build_leaderboard(db)
