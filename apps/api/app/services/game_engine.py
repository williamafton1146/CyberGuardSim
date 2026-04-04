from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.redis_client import LEADERBOARD_KEY, delete_key, get_json, set_json, set_session_state
from app.models.progress import UserScenarioProgress
from app.models.scenario import DecisionOption, Scenario, ScenarioStep
from app.models.session import AnswerEvent, GameSession
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry
from app.schemas.scenario import DecisionOptionPublic, ScenarioStepPublic
from app.schemas.session import AnswerResult, SessionState
from app.services.scenarios import scenario_is_live
from app.services.stats import compute_league


def _session_query(db: Session):
    return (
        db.query(GameSession)
        .options(
            selectinload(GameSession.scenario)
            .selectinload(Scenario.steps)
            .selectinload(ScenarioStep.decision_options)
        )
    )


def serialize_step(step: ScenarioStep | None) -> ScenarioStepPublic | None:
    if step is None:
        return None
    return ScenarioStepPublic(
        id=step.id,
        step_order=step.step_order,
        prompt=step.prompt,
        threat_type=step.threat_type,
        explanation=step.explanation,
        options=[DecisionOptionPublic(id=option.id, label=option.label) for option in step.decision_options],
    )


def _get_step(scenario: Scenario, step_order: int) -> ScenarioStep | None:
    for step in scenario.steps:
        if step.step_order == step_order:
            return step
    return None


def _total_steps(scenario: Scenario) -> int:
    return len(scenario.steps)


def _session_payload(session: GameSession) -> SessionState:
    current_step = _get_step(session.scenario, session.current_step_order) if session.status == "active" else None
    return SessionState(
        session_id=session.id,
        scenario_slug=session.scenario.slug,
        scenario_title=session.scenario.title,
        hp_left=session.hp_left,
        score=session.score,
        status=session.status,
        step_number=session.current_step_order,
        total_steps=_total_steps(session.scenario),
        current_step=serialize_step(current_step),
    )


def _answer_severity(option: DecisionOption) -> str:
    if option.is_correct:
        return "safe"
    if option.hp_delta <= -25:
        return "critical"
    return "warning"


def _load_scenario_progress(db: Session, user_id: int, scenario_id: int) -> UserScenarioProgress | None:
    return db.query(UserScenarioProgress).filter(UserScenarioProgress.user_id == user_id, UserScenarioProgress.scenario_id == scenario_id).first()


def _get_or_create_progress(db: Session, user_id: int, scenario_id: int) -> UserScenarioProgress:
    progress = _load_scenario_progress(db, user_id, scenario_id)
    if progress is not None:
        return progress

    progress = UserScenarioProgress(user_id=user_id, scenario_id=scenario_id)
    db.add(progress)
    db.flush()
    return progress


def _recalculate_user_rating(db: Session, user: User) -> None:
    db.flush()
    best_total = (
        db.query(UserScenarioProgress)
        .filter(UserScenarioProgress.user_id == user.id)
        .with_entities(UserScenarioProgress.best_score)
        .all()
    )
    user.security_rating = sum(score for score, in best_total)
    user.league = compute_league(user.security_rating)


def _apply_progress_update(db: Session, user: User, session: GameSession) -> None:
    if session.status not in {"completed", "failed"}:
        return

    progress = _get_or_create_progress(db, user.id, session.scenario_id)
    progress.attempts_count += 1
    progress.last_played_at = datetime.now(UTC)
    progress.best_completed = progress.best_completed or session.status == "completed"
    if session.score > progress.best_score:
        progress.best_score = session.score

    _recalculate_user_rating(db, user)


def build_leaderboard(db: Session) -> list[LeaderboardEntry]:
    cached = get_json(LEADERBOARD_KEY)
    if isinstance(cached, list):
        return [LeaderboardEntry(**row) for row in cached]

    completed_counts = (
        db.query(
            UserScenarioProgress.user_id.label("user_id"),
            func.count(UserScenarioProgress.id).label("completed_sessions"),
        )
        .filter(UserScenarioProgress.best_completed.is_(True))
        .group_by(UserScenarioProgress.user_id)
        .subquery()
    )
    users = (
        db.query(
            User.display_name,
            User.security_rating,
            User.league,
            func.coalesce(completed_counts.c.completed_sessions, 0).label("completed_sessions"),
        )
        .outerjoin(completed_counts, completed_counts.c.user_id == User.id)
        .filter(User.role != "admin")
        .order_by(User.security_rating.desc(), User.id.asc())
        .limit(10)
        .all()
    )
    entries: list[LeaderboardEntry] = []
    for index, user in enumerate(users, start=1):
        entries.append(
            LeaderboardEntry(
                rank=index,
                display_name=user.display_name,
                security_rating=user.security_rating,
                league=user.league,
                completed_sessions=int(user.completed_sessions or 0),
            )
        )
    set_json(LEADERBOARD_KEY, [entry.model_dump() for entry in entries], ttl=300)
    return entries


def load_session_state(db: Session, session_id: int, *, user_id: int | None = None) -> SessionState | None:
    session_query = _session_query(db).filter(GameSession.id == session_id)
    if user_id is not None:
        session_query = session_query.filter(GameSession.user_id == user_id)
    session = session_query.first()
    if session is None:
        return None

    return _session_payload(session)


def start_session(db: Session, user: User, scenario_slug: str) -> SessionState:
    scenario = (
        db.query(Scenario)
        .options(selectinload(Scenario.steps).selectinload(ScenarioStep.decision_options))
        .filter(Scenario.slug == scenario_slug)
        .first()
    )
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сценарий не найден")
    if not scenario_is_live(scenario):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот сценарий пока недоступен для игроков",
        )

    session = GameSession(user_id=user.id, scenario_id=scenario.id, hp_left=100, score=0, status="active", current_step_order=1)
    db.add(session)
    db.commit()
    db.refresh(session)
    session = _session_query(db).filter(GameSession.id == session.id).first()
    if session is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось инициализировать игровую сессию")

    payload = _session_payload(session)
    set_session_state(session.id, payload.model_dump(mode="json"))
    return payload


def submit_answer(db: Session, user: User, session_id: int, option_id: int) -> AnswerResult:
    session = _session_query(db).filter(GameSession.id == session_id, GameSession.user_id == user.id).first()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Игровая сессия не найдена")
    if session.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сессия уже завершена")

    step = _get_step(session.scenario, session.current_step_order)
    if step is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Для сессии не найден текущий шаг")

    option = db.query(DecisionOption).filter(DecisionOption.id == option_id).first()
    if option is None or option.step_id != step.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Выбранный вариант не относится к текущему шагу")

    session.hp_left = max(0, min(100, session.hp_left + option.hp_delta))
    if option.is_correct:
        session.score += 25 + max(option.hp_delta, 0)
        next_step = _get_step(session.scenario, session.current_step_order + 1)
        if next_step is None:
            session.status = "completed"
            session.finished_at = datetime.now(UTC)
        else:
            session.current_step_order += 1
    else:
        session.score = max(0, session.score - 5)
        if session.hp_left <= 0:
            session.status = "failed"
            session.finished_at = datetime.now(UTC)

    event = AnswerEvent(session_id=session.id, step_id=step.id, option_id=option.id, is_correct=option.is_correct)
    db.add(event)
    _apply_progress_update(db, user, session)
    db.commit()
    db.refresh(session)
    session = _session_query(db).filter(GameSession.id == session.id).first()
    if session is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Игровая сессия потеряна после обновления")

    session_state = _session_payload(session)
    set_session_state(session.id, session_state.model_dump(mode="json"))
    delete_key(LEADERBOARD_KEY)

    return AnswerResult(
        **session_state.model_dump(),
        is_correct=option.is_correct,
        severity=_answer_severity(option),
        hint=option.hint,
        consequence_text=option.consequence_text,
        explanation=step.explanation,
        completed=session.status != "active",
    )
