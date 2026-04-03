from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    security_rating: int
    league: str
    completed_sessions: int

