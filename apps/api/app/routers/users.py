from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_admin_user, get_current_user
from app.models.progress import UserScenarioProgress
from app.models.session import GameSession
from app.models.user import User
from app.schemas.user import AdminUserRead, UserRead, UserStats
from app.services.stats import build_user_stats

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.get("/me/stats", response_model=UserStats)
async def stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserStats:
    return build_user_stats(db, current_user)


admin_router = APIRouter(prefix="/admin/users", tags=["admin"])


@admin_router.get("", response_model=list[AdminUserRead])
async def list_users(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminUserRead]:
    session_counts = (
        db.query(
            GameSession.user_id.label("user_id"),
            func.count(GameSession.id).label("total_sessions"),
        )
        .group_by(GameSession.user_id)
        .subquery()
    )
    completed_counts = (
        db.query(
            UserScenarioProgress.user_id.label("user_id"),
            func.count(UserScenarioProgress.id).label("completed_scenarios"),
        )
        .filter(UserScenarioProgress.best_completed.is_(True))
        .group_by(UserScenarioProgress.user_id)
        .subquery()
    )
    rows = (
        db.query(
            User,
            func.coalesce(session_counts.c.total_sessions, 0).label("total_sessions"),
            func.coalesce(completed_counts.c.completed_scenarios, 0).label("completed_scenarios"),
        )
        .outerjoin(session_counts, session_counts.c.user_id == User.id)
        .outerjoin(completed_counts, completed_counts.c.user_id == User.id)
        .order_by(User.created_at.desc(), User.id.desc())
        .all()
    )

    return [
        AdminUserRead(
            id=user.id,
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            role=user.role,
            security_rating=user.security_rating,
            league=user.league,
            total_sessions=int(total_sessions or 0),
            completed_scenarios=int(completed_scenarios or 0),
            created_at=user.created_at,
        )
        for user, total_sessions, completed_scenarios in rows
    ]


@admin_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Администратор не может удалить собственный аккаунт")
    db.delete(user)
    db.commit()
