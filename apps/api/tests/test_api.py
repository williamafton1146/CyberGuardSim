import asyncio
from fastapi import status
import httpx
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.main import app
from app.routers.auth import login, register
from app.routers.scenarios import list_scenarios
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.session import StartSessionRequest
from app.services.certificates import build_certificate_status, issue_certificate
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


def complete_scenario(db_session: Session, user: User, slug: str) -> None:
    state = start_session(db_session, user, StartSessionRequest(scenario_slug=slug).scenario_slug)
    assert state.current_step is not None
    current_session = state.session_id

    steps = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == slug).order_by(ScenarioStep.step_order).all()
    for step in steps:
        correct_option = (
            db_session.query(DecisionOption)
            .filter(DecisionOption.step_id == step.id, DecisionOption.is_correct.is_(True))
            .first()
        )
        assert correct_option is not None
        submit_answer(db_session, user, current_session, correct_option.id)


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
    assert sum(1 for scenario in scenarios if scenario.is_playable) == 3

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


def test_certificate_is_issued_after_completing_all_playable_scenarios(db_session: Session) -> None:
    user = create_user(db_session, email="certified@example.com")

    initial_status = build_certificate_status(db_session, user)
    assert initial_status.status == "not_eligible"

    for slug in ["office", "home", "public-wifi"]:
        complete_scenario(db_session, user, slug)

    eligible_status = build_certificate_status(db_session, user)
    assert eligible_status.status == "eligible"
    assert eligible_status.completed_scenarios == 3
    assert eligible_status.required_scenarios == 3

    issued_status = issue_certificate(db_session, user)
    assert issued_status.status == "issued"
    assert issued_status.certificate is not None
    assert issued_status.certificate.verify_url.endswith(f"/certificates/{issued_status.certificate.code}")


def test_route_contracts_for_leaderboard_and_certificate_verification(db_session: Session) -> None:
    user = db_session.query(User).filter(User.email == "routecheck@example.com").first()
    assert user is None

    async def override_get_db():
        yield db_session

    async def exercise_routes() -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            register_response = await client.post(
                "/auth/register",
                json={
                    "email": "routecheck@example.com",
                    "password": "supersecure123",
                    "display_name": "Route Check",
                },
            )
            assert register_response.status_code == status.HTTP_201_CREATED
            token = register_response.json()["access_token"]

            leaderboard_unauthorized = await client.get("/api/leaderboard")
            assert leaderboard_unauthorized.status_code == status.HTTP_401_UNAUTHORIZED

            leaderboard_authorized = await client.get("/api/leaderboard", headers={"Authorization": f"Bearer {token}"})
            assert leaderboard_authorized.status_code == status.HTTP_200_OK
            assert isinstance(leaderboard_authorized.json(), list)

            html_response = await client.get("/leaderboard")
            assert html_response.status_code == status.HTTP_404_NOT_FOUND

            user = db_session.query(User).filter(User.email == "routecheck@example.com").first()
            assert user is not None
            for slug in ["office", "home", "public-wifi"]:
                complete_scenario(db_session, user, slug)
            issued_status = issue_certificate(db_session, user)
            assert issued_status.certificate is not None

            verify_response = await client.get(f"/api/certificates/{issued_status.certificate.code}")
            assert verify_response.status_code == status.HTTP_200_OK
            assert verify_response.json()["code"] == issued_status.certificate.code

    app.dependency_overrides[get_db] = override_get_db
    try:
        asyncio.run(exercise_routes())
    finally:
        app.dependency_overrides.clear()
