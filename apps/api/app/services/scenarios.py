from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.models.scenario import DecisionOption, Scenario, ScenarioStep
from app.models.session import GameSession
from app.schemas.scenario import (
    AdminDecisionOptionRead,
    AdminScenarioRead,
    AdminScenarioStepRead,
    AdminScenarioUpsert,
    ScenarioDetail,
    ScenarioListItem,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def scenario_status_value(scenario: Scenario, now: datetime | None = None) -> str:
    current_time = now or utc_now()
    release_at = _normalize_datetime(scenario.release_at)
    if scenario.is_enabled:
        if release_at and release_at > current_time:
            return "scheduled"
        return "live"
    return "disabled" if release_at else "draft"


def scenario_is_live(scenario: Scenario, now: datetime | None = None) -> bool:
    return scenario_status_value(scenario, now) == "live"


def scenario_has_sessions(db: Session, scenario_id: int) -> bool:
    return db.query(GameSession.id).filter(GameSession.scenario_id == scenario_id).first() is not None


def serialize_scenario_public(scenario: Scenario, now: datetime | None = None) -> ScenarioListItem:
    return ScenarioListItem(
        id=scenario.id,
        slug=scenario.slug,
        title=scenario.title,
        theme=scenario.theme,
        difficulty=scenario.difficulty,
        description=scenario.description,
        is_playable=scenario_is_live(scenario, now),
        step_count=len(scenario.steps),
    )


def serialize_scenario_detail(scenario: Scenario, now: datetime | None = None) -> ScenarioDetail:
    return ScenarioDetail(
        **serialize_scenario_public(scenario, now).model_dump(),
        steps=[
            {
                "id": step.id,
                "step_order": step.step_order,
                "prompt": step.prompt,
                "threat_type": step.threat_type,
                "explanation": step.explanation,
                "options": [{"id": option.id, "label": option.label} for option in step.decision_options],
            }
            for step in scenario.steps
        ],
    )


def serialize_admin_scenario(
    scenario: Scenario,
    db: Session,
    now: datetime | None = None,
    *,
    has_sessions: bool | None = None,
) -> AdminScenarioRead:
    return AdminScenarioRead(
        id=scenario.id,
        slug=scenario.slug,
        title=scenario.title,
        theme=scenario.theme,
        difficulty=scenario.difficulty,
        description=scenario.description,
        is_enabled=scenario.is_enabled,
        release_at=scenario.release_at,
        status=scenario_status_value(scenario, now),
        is_playable=scenario_is_live(scenario, now),
        step_count=len(scenario.steps),
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        has_sessions=scenario_has_sessions(db, scenario.id) if has_sessions is None else has_sessions,
        steps=[
            AdminScenarioStepRead(
                id=step.id,
                step_order=step.step_order,
                prompt=step.prompt,
                threat_type=step.threat_type,
                explanation=step.explanation,
                options=[
                    AdminDecisionOptionRead(
                        id=option.id,
                        label=option.label,
                        is_correct=option.is_correct,
                        hp_delta=option.hp_delta,
                        hint=option.hint,
                        consequence_text=option.consequence_text,
                    )
                    for option in step.decision_options
                ],
            )
            for step in scenario.steps
        ],
    )


def list_live_scenarios(db: Session) -> list[Scenario]:
    now = utc_now()
    return (
        db.query(Scenario)
        .options(selectinload(Scenario.steps))
        .filter(Scenario.is_enabled.is_(True))
        .filter(or_(Scenario.release_at.is_(None), Scenario.release_at <= now))
        .order_by(Scenario.id)
        .all()
    )


def get_live_scenario_by_slug(db: Session, slug: str) -> Scenario | None:
    now = utc_now()
    return (
        db.query(Scenario)
        .options(selectinload(Scenario.steps).selectinload(ScenarioStep.decision_options))
        .filter(Scenario.slug == slug, Scenario.is_enabled.is_(True))
        .filter(or_(Scenario.release_at.is_(None), Scenario.release_at <= now))
        .first()
    )


def validate_scenario_payload(payload: AdminScenarioUpsert) -> None:
    if not payload.steps:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сценарий должен содержать хотя бы один шаг")

    used_step_orders: set[int] = set()
    for step in payload.steps:
        if step.step_order in used_step_orders:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Порядок шагов должен быть уникальным")
        used_step_orders.add(step.step_order)

        correct_options = [option for option in step.options if option.is_correct]
        if len(correct_options) != 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="В каждом шаге должен быть ровно один правильный вариант")


def apply_scenario_payload(
    db: Session,
    scenario: Scenario,
    payload: AdminScenarioUpsert,
    *,
    allow_structure_edit: bool,
) -> Scenario:
    validate_scenario_payload(payload)

    existing_slug = db.query(Scenario).filter(Scenario.slug == payload.slug, Scenario.id != scenario.id).first()
    if existing_slug is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Сценарий с таким slug уже существует")

    scenario.slug = payload.slug
    scenario.title = payload.title
    scenario.theme = payload.theme
    scenario.difficulty = payload.difficulty
    scenario.description = payload.description
    scenario.is_enabled = payload.is_enabled
    scenario.release_at = payload.release_at
    scenario.is_playable = payload.is_enabled

    if not allow_structure_edit:
        db.flush()
        return scenario

    for existing_step in list(scenario.steps):
        db.delete(existing_step)
    db.flush()

    for step_payload in sorted(payload.steps, key=lambda item: item.step_order):
        step = ScenarioStep(
            scenario_id=scenario.id,
            step_order=step_payload.step_order,
            prompt=step_payload.prompt,
            threat_type=step_payload.threat_type,
            explanation=step_payload.explanation,
        )
        db.add(step)
        db.flush()

        for option_payload in step_payload.options:
            db.add(
                DecisionOption(
                    step_id=step.id,
                    label=option_payload.label,
                    is_correct=option_payload.is_correct,
                    hp_delta=option_payload.hp_delta,
                    hint=option_payload.hint,
                    consequence_text=option_payload.consequence_text,
                )
            )

    db.flush()
    db.refresh(scenario)
    _ = scenario.steps
    for step in scenario.steps:
        _ = step.decision_options
    return scenario


def delete_scenario(db: Session, scenario: Scenario) -> None:
    if scenario_has_sessions(db, scenario.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить сценарий, у которого уже есть пользовательские прохождения. Отключите его вместо удаления.",
        )
    db.delete(scenario)
