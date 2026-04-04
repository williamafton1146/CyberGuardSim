from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class UserScenarioProgress(Base):
    __tablename__ = "user_scenario_progress"
    __table_args__ = (UniqueConstraint("user_id", "scenario_id", name="uq_user_scenario_progress"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    best_score: Mapped[int] = mapped_column(Integer, default=0)
    best_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts_count: Mapped[int] = mapped_column(Integer, default=0)
    last_played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )

    user = relationship("User", back_populates="scenario_progress")
    scenario = relationship("Scenario", back_populates="user_progress")
