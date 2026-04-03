from pydantic import BaseModel


class DecisionOptionPublic(BaseModel):
    id: int
    label: str


class ScenarioStepPublic(BaseModel):
    id: int
    step_order: int
    prompt: str
    threat_type: str
    explanation: str
    options: list[DecisionOptionPublic]


class ScenarioListItem(BaseModel):
    slug: str
    title: str
    theme: str
    difficulty: str
    description: str
    is_playable: bool
    step_count: int


class ScenarioDetail(ScenarioListItem):
    steps: list[ScenarioStepPublic]

