from datetime import datetime

from pydantic import BaseModel, Field, field_validator


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
    max_score: int


class ScenarioDetail(ScenarioListItem):
    steps: list[ScenarioStepPublic]


class AdminDecisionOptionPayload(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    is_correct: bool
    hp_delta: int
    hint: str | None = Field(default=None, max_length=500)
    consequence_text: str = Field(min_length=1, max_length=1500)

    @field_validator("label", "consequence_text", mode="before")
    @classmethod
    def normalize_option_strings(cls, value: str) -> str:
        return value.strip()

    @field_validator("hint", mode="before")
    @classmethod
    def normalize_hint(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AdminScenarioStepPayload(BaseModel):
    step_order: int = Field(ge=1)
    prompt: str = Field(min_length=1, max_length=2000)
    threat_type: str = Field(min_length=1, max_length=120)
    explanation: str = Field(min_length=1, max_length=3000)
    options: list[AdminDecisionOptionPayload] = Field(min_length=2)

    @field_validator("prompt", "threat_type", "explanation", mode="before")
    @classmethod
    def normalize_step_strings(cls, value: str) -> str:
        return value.strip()


class AdminScenarioUpsert(BaseModel):
    slug: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=2, max_length=255)
    theme: str = Field(min_length=2, max_length=255)
    difficulty: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=2, max_length=1500)
    is_enabled: bool = False
    release_at: datetime | None = None
    steps: list[AdminScenarioStepPayload] = Field(default_factory=list)

    @field_validator(
        "slug",
        "title",
        "theme",
        "difficulty",
        "description",
        mode="before",
    )
    @classmethod
    def normalize_strings(cls, value: str) -> str:
        return value.strip()


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
