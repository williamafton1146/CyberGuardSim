from pydantic import BaseModel

from app.schemas.scenario import ScenarioStepPublic


class StartSessionRequest(BaseModel):
    scenario_slug: str


class SessionState(BaseModel):
    session_id: int
    scenario_slug: str
    scenario_title: str
    hp_left: int
    score: int
    status: str
    step_number: int
    total_steps: int
    current_step: ScenarioStepPublic | None


class AnswerRequest(BaseModel):
    option_id: int


class AnswerResult(SessionState):
    is_correct: bool
    severity: str
    hint: str | None
    consequence_text: str
    explanation: str
    completed: bool
