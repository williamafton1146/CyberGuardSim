from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_admin_user, get_current_user
from app.models.progress import UserScenarioProgress
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
    users = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    payload: list[AdminUserRead] = []

    for user in users:
        total_sessions = len(user.sessions)
        completed_scenarios = (
            db.query(UserScenarioProgress)
            .filter(UserScenarioProgress.user_id == user.id, UserScenarioProgress.best_completed.is_(True))
            .count()
        )
        payload.append(
            AdminUserRead(
                id=user.id,
                email=user.email,
                username=user.username,
                display_name=user.display_name,
                role=user.role,
                security_rating=user.security_rating,
                league=user.league,
                total_sessions=total_sessions,
                completed_scenarios=completed_scenarios,
                created_at=user.created_at,
            )
        )
    return payload


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
