import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
import httpx
import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.main import app
from app.models.progress import UserScenarioProgress
from app.routers.auth import login, register
from app.routers.scenarios import list_scenarios
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.session import StartSessionRequest
from app.services.admin_bootstrap import ensure_admin_user
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


def complete_scenario(db_session: Session, user: User, slug: str):
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
        result = submit_answer(db_session, user, current_session, correct_option.id)

    return result


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


def test_admin_login_access_and_self_delete_protection(db_session: Session) -> None:
    admin = ensure_admin_user(db_session)
    create_user(db_session, email="basic-user@example.com", password="strongpass123")

    admin_login = asyncio.run(login(LoginRequest(identifier=settings.admin_username, password=settings.admin_bootstrap_password), db_session))
    assert admin_login.redirect_to == "/admin"

    user_login = asyncio.run(login(LoginRequest(identifier="basic-user@example.com", password="strongpass123"), db_session))
    assert user_login.redirect_to == "/simulator"

    async def override_get_db():
        yield db_session

    async def exercise_routes() -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            admin_me = await client.get("/users/me", headers={"Authorization": f"Bearer {admin_login.access_token}"})
            assert admin_me.status_code == status.HTTP_200_OK
            assert admin_me.json()["role"] == "admin"

            forbidden_admin_list = await client.get("/admin/users", headers={"Authorization": f"Bearer {user_login.access_token}"})
            assert forbidden_admin_list.status_code == status.HTTP_403_FORBIDDEN

            admin_users = await client.get("/admin/users", headers={"Authorization": f"Bearer {admin_login.access_token}"})
            assert admin_users.status_code == status.HTTP_200_OK
            assert any(item["role"] == "admin" for item in admin_users.json())

            delete_self = await client.delete(f"/admin/users/{admin.id}", headers={"Authorization": f"Bearer {admin_login.access_token}"})
            assert delete_self.status_code == status.HTTP_400_BAD_REQUEST

    app.dependency_overrides[get_db] = override_get_db
    try:
        asyncio.run(exercise_routes())
    finally:
        app.dependency_overrides.clear()


def test_scheduled_scenarios_are_hidden_and_best_score_only_counts_once(db_session: Session) -> None:
    user = create_user(db_session, email="scorekeeper@example.com")
    office = db_session.query(Scenario).filter(Scenario.slug == "office").first()
    assert office is not None

    office.release_at = datetime.now(UTC) + timedelta(hours=2)
    office.is_enabled = True
    db_session.commit()

    hidden_scenarios = asyncio.run(list_scenarios(db_session))
    assert all(scenario.slug != "office" for scenario in hidden_scenarios)

    with pytest.raises(HTTPException) as exc_info:
        start_session(db_session, user, StartSessionRequest(scenario_slug="office").scenario_slug)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    office.release_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    visible_scenarios = asyncio.run(list_scenarios(db_session))
    assert any(scenario.slug == "office" for scenario in visible_scenarios)

    first_state = start_session(db_session, user, StartSessionRequest(scenario_slug="office").scenario_slug)
    first_step = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == "office", ScenarioStep.step_order == 1).first()
    first_step_correct_option = (
        db_session.query(DecisionOption)
        .filter(DecisionOption.step_id == first_step.id, DecisionOption.is_correct.is_(True))
        .first()
    )
    assert first_step_correct_option is not None
    submit_answer(db_session, user, first_state.session_id, first_step_correct_option.id)

    second_step = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == "office", ScenarioStep.step_order == 2).first()
    wrong_option = (
        db_session.query(DecisionOption)
        .filter(DecisionOption.step_id == second_step.id, DecisionOption.is_correct.is_(False))
        .first()
    )
    assert wrong_option is not None
    submit_answer(db_session, user, first_state.session_id, wrong_option.id)

    imperfect_result = None
    for step_order in range(2, 5):
        step = db_session.query(ScenarioStep).join(Scenario).filter(Scenario.slug == "office", ScenarioStep.step_order == step_order).first()
        correct_option = (
            db_session.query(DecisionOption)
            .filter(DecisionOption.step_id == step.id, DecisionOption.is_correct.is_(True))
            .first()
        )
        imperfect_result = submit_answer(db_session, user, first_state.session_id, correct_option.id)

    assert imperfect_result is not None
    imperfect_score = imperfect_result.score
    db_session.refresh(user)
    assert user.security_rating == imperfect_score

    perfect_result = complete_scenario(db_session, user, "office")
    db_session.refresh(user)
    assert user.security_rating == perfect_result.score
    assert perfect_result.score > imperfect_score

    repeated_best_result = complete_scenario(db_session, user, "office")
    db_session.refresh(user)
    assert repeated_best_result.score == perfect_result.score
    assert user.security_rating == perfect_result.score

    progress = (
        db_session.query(UserScenarioProgress)
        .filter(UserScenarioProgress.user_id == user.id, UserScenarioProgress.scenario_id == office.id)
        .first()
    )
    assert progress is not None
    assert progress.best_score == perfect_result.score
    assert progress.attempts_count == 3


def test_admin_can_create_schedule_publish_and_delete_scenario(db_session: Session) -> None:
    ensure_admin_user(db_session)
    admin_login = asyncio.run(login(LoginRequest(identifier=settings.admin_username, password=settings.admin_bootstrap_password), db_session))

    async def override_get_db():
        yield db_session

    async def exercise_routes() -> None:
        scheduled_release = (datetime.now(UTC) + timedelta(hours=3)).isoformat()
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            create_response = await client.post(
                "/admin/scenarios",
                headers={"Authorization": f"Bearer {admin_login.access_token}"},
                json={
                    "slug": "banking-premiere",
                    "title": "Премьера: подозрительный банковский звонок",
                    "theme": "Телефонное мошенничество",
                    "difficulty": "medium",
                    "description": "Новый сценарий для проверки публикации по времени.",
                    "is_enabled": True,
                    "release_at": scheduled_release,
                    "steps": [
                        {
                            "step_order": 1,
                            "prompt": "Вам звонят и просят перевести деньги на безопасный счет. Что делать?",
                            "threat_type": "social-engineering",
                            "explanation": "Безопасных счетов для срочных переводов не существует.",
                            "options": [
                                {
                                    "label": "Положить трубку и проверить информацию в официальном приложении банка",
                                    "is_correct": True,
                                    "hp_delta": 10,
                                    "hint": "Свяжитесь с банком по номеру с карты или из приложения.",
                                    "consequence_text": "Вы не передали данные и остановили цепочку атаки.",
                                },
                                {
                                    "label": "Продолжить разговор и продиктовать код из SMS",
                                    "is_correct": False,
                                    "hp_delta": -35,
                                    "hint": "Никогда не сообщайте одноразовые коды по телефону.",
                                    "consequence_text": "Мошенники получают доступ к операции и пытаются вывести деньги.",
                                },
                            ],
                        }
                    ],
                },
            )
            assert create_response.status_code == status.HTTP_201_CREATED
            created = create_response.json()
            assert created["status"] == "scheduled"
            assert created["is_playable"] is False

            public_before_release = await client.get("/scenarios")
            assert public_before_release.status_code == status.HTTP_200_OK
            assert all(item["slug"] != "banking-premiere" for item in public_before_release.json())

            publish_response = await client.patch(
                f"/admin/scenarios/{created['id']}",
                headers={"Authorization": f"Bearer {admin_login.access_token}"},
                json={
                    "slug": "banking-premiere",
                    "title": "Премьера: подозрительный банковский звонок",
                    "theme": "Телефонное мошенничество",
                    "difficulty": "medium",
                    "description": "Новый сценарий для проверки публикации по времени.",
                    "is_enabled": True,
                    "release_at": (datetime.now(UTC) - timedelta(minutes=2)).isoformat(),
                    "steps": [
                        {
                            "step_order": 1,
                            "prompt": "Вам звонят и просят перевести деньги на безопасный счет. Что делать?",
                            "threat_type": "social-engineering",
                            "explanation": "Безопасных счетов для срочных переводов не существует.",
                            "options": [
                                {
                                    "label": "Положить трубку и проверить информацию в официальном приложении банка",
                                    "is_correct": True,
                                    "hp_delta": 10,
                                    "hint": "Свяжитесь с банком по номеру с карты или из приложения.",
                                    "consequence_text": "Вы не передали данные и остановили цепочку атаки.",
                                },
                                {
                                    "label": "Продолжить разговор и продиктовать код из SMS",
                                    "is_correct": False,
                                    "hp_delta": -35,
                                    "hint": "Никогда не сообщайте одноразовые коды по телефону.",
                                    "consequence_text": "Мошенники получают доступ к операции и пытаются вывести деньги.",
                                },
                            ],
                        }
                    ],
                },
            )
            assert publish_response.status_code == status.HTTP_200_OK
            assert publish_response.json()["status"] == "live"

            public_after_release = await client.get("/scenarios")
            assert public_after_release.status_code == status.HTTP_200_OK
            assert any(item["slug"] == "banking-premiere" for item in public_after_release.json())

            delete_response = await client.delete(
                f"/admin/scenarios/{created['id']}",
                headers={"Authorization": f"Bearer {admin_login.access_token}"},
            )
            assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    app.dependency_overrides[get_db] = override_get_db
    try:
        asyncio.run(exercise_routes())
    finally:
        app.dependency_overrides.clear()
