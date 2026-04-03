from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.scenario import Scenario
from app.schemas.scenario import ScenarioDetail, ScenarioListItem
from app.services.game_engine import serialize_step

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioListItem])
async def list_scenarios(db: Session = Depends(get_db)) -> list[ScenarioListItem]:
    scenarios = db.query(Scenario).order_by(Scenario.id).all()
    return [
        ScenarioListItem(
            slug=scenario.slug,
            title=scenario.title,
            theme=scenario.theme,
            difficulty=scenario.difficulty,
            description=scenario.description,
            is_playable=scenario.is_playable,
            step_count=len(scenario.steps),
        )
        for scenario in scenarios
    ]


@router.get("/{slug}", response_model=ScenarioDetail)
async def get_scenario(slug: str, db: Session = Depends(get_db)) -> ScenarioDetail:
    scenario = db.query(Scenario).filter(Scenario.slug == slug).first()
    if scenario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сценарий не найден")
    return ScenarioDetail(
        slug=scenario.slug,
        title=scenario.title,
        theme=scenario.theme,
        difficulty=scenario.difficulty,
        description=scenario.description,
        is_playable=scenario.is_playable,
        step_count=len(scenario.steps),
        steps=[serialize_step(step) for step in scenario.steps if serialize_step(step) is not None],
    )
