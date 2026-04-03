from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    hp_left: Mapped[int] = mapped_column(Integer, default=100)
    score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="active")
    current_step_order: Mapped[int] = mapped_column(Integer, default=1)

    user = relationship("User", back_populates="sessions")
    scenario = relationship("Scenario", back_populates="sessions")
    answer_events = relationship("AnswerEvent", back_populates="session", cascade="all, delete-orphan")


class AnswerEvent(Base):
    __tablename__ = "answer_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True)
    step_id: Mapped[int] = mapped_column(ForeignKey("scenario_steps.id", ondelete="CASCADE"), index=True)
    option_id: Mapped[int] = mapped_column(ForeignKey("decision_options.id", ondelete="CASCADE"), index=True)
    is_correct: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session = relationship("GameSession", back_populates="answer_events")
    step = relationship("ScenarioStep", back_populates="answers")
    option = relationship("DecisionOption", back_populates="answers")
