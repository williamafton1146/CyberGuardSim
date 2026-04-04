from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    id: int
    email: str
    display_name: str
    security_rating: int
    league: str

    model_config = ConfigDict(from_attributes=True)


class ScenarioProgress(BaseModel):
    slug: str
    title: str
    status: str
    best_score: int


class RecentMistake(BaseModel):
    scenario_title: str
    step_prompt: str
    option_label: str
    consequence_text: str


class UserStats(BaseModel):
    total_sessions: int
    completed_sessions: int
    success_rate: float
    average_score: float
    total_mistakes: int
    scenario_progress: list[ScenarioProgress]
    recent_mistakes: list[RecentMistake]
