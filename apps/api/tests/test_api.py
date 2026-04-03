import asyncio
from sqlalchemy.orm import Session

from app.routers.auth import login, register
from app.routers.scenarios import list_scenarios
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.session import StartSessionRequest
from app.services.game_engine import build_leaderboard, start_session, submit_answer
from app.services.stats import build_user_stats
from app.models.scenario import DecisionOption, Scenario, ScenarioStep
from app.models.user import User


def create_user(db_session: Session, email: str = "analyst@example.com", password: str = "strongpass123") -> User:
    asyncio.run(
        register(
            RegisterRequest(
                email=email,
                password=password,
                display_name="Аналитик",
            ),
            db_session,
        )
    )
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    return user


def test_register_login_and_profile(db_session: Session) -> None:
    token_response = asyncio.run(
        register(
            RegisterRequest(
                email="hero@example.com",
                password="supersecure123",
                display_name="Герой",
            ),
            db_session,
        )
    )
    assert token_response.access_token
    created_user = db_session.query(User).filter(User.email == "hero@example.com").first()
    assert created_user is not None
    assert created_user.password_hash != "supersecure123"

    login_response = asyncio.run(
        login(
            LoginRequest(email="hero@example.com", password="supersecure123"),
            db_session,
        )
    )
    assert login_response.access_token

    stats_response = build_user_stats(db_session, created_user)
    assert stats_response.total_sessions == 0


def test_scenarios_and_session_progression(db_session: Session) -> None:
    user = create_user(db_session)

    scenarios = asyncio.run(list_scenarios(db_session))
    assert len(scenarios) == 3
    assert sum(1 for scenario in scenarios if scenario.is_playable) == 1

    state = start_session(db_session, user, StartSessionRequest(scenario_slug="office").scenario_slug)
    assert state.hp_left == 100
    assert state.current_step is not None
    assert state.current_step.step_order == 1

    first_step = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == "office", ScenarioStep.step_order == 1).first()
    wrong_option = (
        db_session.query(DecisionOption)
        .filter(DecisionOption.step_id == first_step.id, DecisionOption.is_correct.is_(False))
        .first()
    )
    answer_payload = submit_answer(db_session, user, state.session_id, wrong_option.id)
    assert answer_payload.is_correct is False
    assert answer_payload.hp_left < 100
    assert answer_payload.hint

    current_session = answer_payload.session_id
    for step_order in range(1, 5):
        step = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == "office", ScenarioStep.step_order == step_order).first()
        correct_option = (
            db_session.query(DecisionOption)
            .filter(DecisionOption.step_id == step.id, DecisionOption.is_correct.is_(True))
            .first()
        )
        completion_response = submit_answer(db_session, user, current_session, correct_option.id)

    assert completion_response.completed is True
    assert completion_response.status == "completed"

    stats_payload = build_user_stats(db_session, user)
    assert stats_payload.completed_sessions == 1
    assert stats_payload.success_rate > 0

    leaderboard = build_leaderboard(db_session)
    assert leaderboard[0].display_name == "Аналитик"
