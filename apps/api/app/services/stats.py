from sqlalchemy.orm import Session

from app.models.scenario import Scenario, ScenarioStep
from app.models.session import AnswerEvent, GameSession
from app.models.user import User
from app.schemas.user import RecentMistake, ScenarioProgress, UserStats


def compute_league(security_rating: int) -> str:
    if security_rating >= 180:
        return "Эксперт"
    if security_rating >= 110:
        return "Аналитик"
    if security_rating >= 60:
        return "Охотник на фишинг"
    return "Новичок"


def build_user_stats(db: Session, user: User) -> UserStats:
    sessions = db.query(GameSession).filter(GameSession.user_id == user.id).all()
    answers = (
        db.query(AnswerEvent)
        .join(GameSession, GameSession.id == AnswerEvent.session_id)
        .filter(GameSession.user_id == user.id)
        .all()
    )
    total_answers = len(answers)
    correct_answers = sum(1 for answer in answers if answer.is_correct)
    completed_sessions = sum(1 for session in sessions if session.status == "completed")
    average_score = round(sum(session.score for session in sessions) / len(sessions), 1) if sessions else 0.0
    success_rate = round((correct_answers / total_answers) * 100, 1) if total_answers else 0.0
    total_mistakes = sum(1 for answer in answers if not answer.is_correct)

    progress_rows = []
    for scenario in db.query(Scenario).order_by(Scenario.id).all():
        related_sessions = [session for session in sessions if session.scenario_id == scenario.id]
        if related_sessions:
            best_score = max(session.score for session in related_sessions)
            status = "completed" if any(session.status == "completed" for session in related_sessions) else related_sessions[-1].status
        else:
            best_score = 0
            status = "locked" if not scenario.is_playable else "not_started"
        progress_rows.append(
            ScenarioProgress(
                slug=scenario.slug,
                title=scenario.title,
                status=status,
                best_score=best_score,
            )
        )

    recent_error_rows = (
        db.query(AnswerEvent, Scenario.title, ScenarioStep.prompt)
        .join(GameSession, GameSession.id == AnswerEvent.session_id)
        .join(ScenarioStep, ScenarioStep.id == AnswerEvent.step_id)
        .join(Scenario, Scenario.id == GameSession.scenario_id)
        .filter(GameSession.user_id == user.id, AnswerEvent.is_correct.is_(False))
        .order_by(AnswerEvent.created_at.desc())
        .limit(5)
        .all()
    )
    recent_mistakes = [
        RecentMistake(
            scenario_title=title,
            step_prompt=prompt,
            option_label=event.option.label,
            consequence_text=event.option.consequence_text,
        )
        for event, title, prompt in recent_error_rows
    ]

    return UserStats(
        total_sessions=len(sessions),
        completed_sessions=completed_sessions,
        success_rate=success_rate,
        average_score=average_score,
        total_mistakes=total_mistakes,
        scenario_progress=progress_rows,
        recent_mistakes=recent_mistakes,
    )

