from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_admin_user
from app.models.scenario import Scenario
from app.models.user import User
from app.schemas.scenario import AdminScenarioRead, AdminScenarioUpsert, ScenarioDetail, ScenarioListItem
from app.services.scenarios import (
    apply_scenario_payload,
    delete_scenario,
    get_live_scenario_by_slug,
    list_live_scenarios,
    scenario_has_sessions,
    serialize_admin_scenario,
    serialize_scenario_detail,
    serialize_scenario_public,
)

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioListItem])
async def list_scenarios(db: Session = Depends(get_db)) -> list[ScenarioListItem]:
    return [serialize_scenario_public(scenario) for scenario in list_live_scenarios(db)]


@router.get("/{slug}", response_model=ScenarioDetail)
async def get_scenario(slug: str, db: Session = Depends(get_db)) -> ScenarioDetail:
    scenario = get_live_scenario_by_slug(db, slug)
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сценарий не найден")
    return serialize_scenario_detail(scenario)


admin_router = APIRouter(prefix="/admin/scenarios", tags=["admin"])


@admin_router.get("", response_model=list[AdminScenarioRead])
async def list_admin_scenarios(
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> list[AdminScenarioRead]:
    scenarios = db.query(Scenario).order_by(Scenario.id).all()
    return [serialize_admin_scenario(scenario, db) for scenario in scenarios]


@admin_router.post("", response_model=AdminScenarioRead, status_code=status.HTTP_201_CREATED)
async def create_admin_scenario(
    payload: AdminScenarioUpsert,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> AdminScenarioRead:
    scenario = Scenario(
        slug=payload.slug,
        title=payload.title,
        theme=payload.theme,
        difficulty=payload.difficulty,
        description=payload.description,
        is_playable=payload.is_enabled,
        is_enabled=payload.is_enabled,
        release_at=payload.release_at,
    )
    db.add(scenario)
    db.flush()
    apply_scenario_payload(db, scenario, payload, allow_structure_edit=True)
    db.commit()
    db.refresh(scenario)
    return serialize_admin_scenario(scenario, db)


@admin_router.patch("/{scenario_id}", response_model=AdminScenarioRead)
async def update_admin_scenario(
    scenario_id: int,
    payload: AdminScenarioUpsert,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> AdminScenarioRead:
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сценарий не найден")

    allow_structure_edit = not scenario_has_sessions(db, scenario.id)
    if not allow_structure_edit:
        if len(scenario.steps) != len(payload.steps):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя менять структуру сценария после пользовательских прохождений. Создайте новый сценарий или отключите текущий.",
            )
        for existing_step, incoming_step in zip(scenario.steps, sorted(payload.steps, key=lambda item: item.step_order), strict=False):
            if (
                existing_step.prompt != incoming_step.prompt
                or existing_step.step_order != incoming_step.step_order
                or len(existing_step.decision_options) != len(incoming_step.options)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Нельзя менять шаги и варианты ответа после пользовательских прохождений. Создайте новый сценарий или отключите текущий.",
                )

    apply_scenario_payload(db, scenario, payload, allow_structure_edit=allow_structure_edit)
    db.commit()
    db.refresh(scenario)
    return serialize_admin_scenario(scenario, db)


@admin_router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_scenario(
    scenario_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> None:
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сценарий не найден")
    delete_scenario(db, scenario)
    db.commit()
