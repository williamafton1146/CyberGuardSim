from datetime import datetime

from pydantic import BaseModel, Field


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
    id: int
    slug: str
    title: str
    theme: str
    difficulty: str
    description: str
    is_playable: bool
    step_count: int


class ScenarioDetail(ScenarioListItem):
    steps: list[ScenarioStepPublic]


class AdminDecisionOptionPayload(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    is_correct: bool
    hp_delta: int
    hint: str | None = None
    consequence_text: str = Field(min_length=1)


class AdminScenarioStepPayload(BaseModel):
    step_order: int = Field(ge=1)
    prompt: str = Field(min_length=1)
    threat_type: str = Field(min_length=1, max_length=120)
    explanation: str = Field(min_length=1)
    options: list[AdminDecisionOptionPayload] = Field(min_length=2)


class AdminScenarioUpsert(BaseModel):
    slug: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=2, max_length=255)
    theme: str = Field(min_length=2, max_length=255)
    difficulty: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=2)
    is_enabled: bool = False
    release_at: datetime | None = None
    steps: list[AdminScenarioStepPayload] = Field(default_factory=list)


class AdminDecisionOptionRead(BaseModel):
    id: int
    label: str
    is_correct: bool
    hp_delta: int
    hint: str | None = None
    consequence_text: str


class AdminScenarioStepRead(BaseModel):
    id: int
    step_order: int
    prompt: str
    threat_type: str
    explanation: str
    options: list[AdminDecisionOptionRead]


class AdminScenarioRead(BaseModel):
    id: int
    slug: str
    title: str
    theme: str
    difficulty: str
    description: str
    is_enabled: bool
    release_at: datetime | None = None
    status: str
    is_playable: bool
    step_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    has_sessions: bool
    steps: list[AdminScenarioStepRead]
