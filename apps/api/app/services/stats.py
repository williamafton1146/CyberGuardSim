from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.progress import UserScenarioProgress
from app.models.scenario import DecisionOption, Scenario, ScenarioStep
from app.models.session import AnswerEvent, GameSession
from app.models.user import User
from app.schemas.user import RecentMistake, ScenarioProgress, UserStats
from app.services.scenarios import scenario_is_live, scenario_status_value


def compute_league(security_rating: int) -> str:
    if security_rating >= 180:
        return "Эксперт"
    if security_rating >= 110:
        return "Аналитик"
    if security_rating >= 60:
        return "Охотник на фишинг"
    return "Новичок"


def build_user_stats(db: Session, user: User) -> UserStats:
    session_totals = (
        db.query(
            func.count(GameSession.id).label("total_sessions"),
            func.coalesce(func.avg(GameSession.score), 0).label("average_score"),
        )
        .filter(GameSession.user_id == user.id)
        .one()
    )
    answer_totals = (
        db.query(
            func.count(AnswerEvent.id).label("total_answers"),
            func.coalesce(func.sum(case((AnswerEvent.is_correct.is_(True), 1), else_=0)), 0).label("correct_answers"),
        )
        .select_from(AnswerEvent)
        .join(GameSession, GameSession.id == AnswerEvent.session_id)
        .filter(GameSession.user_id == user.id)
        .one()
    )
    progress_rows = {
        progress.scenario_id: progress for progress in db.query(UserScenarioProgress).filter(UserScenarioProgress.user_id == user.id).all()
    }

    total_answers = int(answer_totals.total_answers or 0)
    correct_answers = int(answer_totals.correct_answers or 0)
    completed_sessions = sum(1 for progress in progress_rows.values() if progress.best_completed)
    average_score = round(float(session_totals.average_score or 0), 1)
    success_rate = round((correct_answers / total_answers) * 100, 1) if total_answers else 0.0
    total_mistakes = max(total_answers - correct_answers, 0)

    known_scenario_ids = set(progress_rows.keys())
    scenarios = db.query(Scenario).order_by(Scenario.id).all()
    scenario_cards = []
    for scenario in scenarios:
        if not scenario_is_live(scenario) and scenario.id not in known_scenario_ids:
            continue
        progress = progress_rows.get(scenario.id)
        if progress is not None:
            status = "completed" if progress.best_completed else "in_progress"
            best_score = progress.best_score
        else:
            best_score = 0
            status = "not_started" if scenario_is_live(scenario) else scenario_status_value(scenario)

        scenario_cards.append(
            ScenarioProgress(
                slug=scenario.slug,
                title=scenario.title,
                status=status,
                best_score=best_score,
            )
        )

    recent_error_rows = (
        db.query(Scenario.title, ScenarioStep.prompt, DecisionOption.label, DecisionOption.consequence_text)
        .select_from(AnswerEvent)
        .join(GameSession, GameSession.id == AnswerEvent.session_id)
        .join(ScenarioStep, ScenarioStep.id == AnswerEvent.step_id)
        .join(DecisionOption, DecisionOption.id == AnswerEvent.option_id)
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
            option_label=option_label,
            consequence_text=consequence_text,
        )
        for title, prompt, option_label, consequence_text in recent_error_rows
    ]

    return UserStats(
        total_sessions=int(session_totals.total_sessions or 0),
        completed_sessions=completed_sessions,
        success_rate=success_rate,
        average_score=average_score,
        total_mistakes=total_mistakes,
        scenario_progress=scenario_cards,
        recent_mistakes=recent_mistakes,
    )
