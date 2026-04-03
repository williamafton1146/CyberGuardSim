from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    theme: Mapped[str] = mapped_column(String(255))
    difficulty: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    is_playable: Mapped[bool] = mapped_column(Boolean, default=False)

    steps = relationship(
        "ScenarioStep",
        back_populates="scenario",
        order_by="ScenarioStep.step_order",
        cascade="all, delete-orphan",
    )
    sessions = relationship("GameSession", back_populates="scenario")


class ScenarioStep(Base):
    __tablename__ = "scenario_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"), index=True)
    step_order: Mapped[int] = mapped_column(Integer)
    prompt: Mapped[str] = mapped_column(Text)
    threat_type: Mapped[str] = mapped_column(String(120))
    explanation: Mapped[str] = mapped_column(Text)

    scenario = relationship("Scenario", back_populates="steps")
    decision_options = relationship(
        "DecisionOption",
        back_populates="step",
        cascade="all, delete-orphan",
    )
    answers = relationship("AnswerEvent", back_populates="step")


class DecisionOption(Base):
    __tablename__ = "decision_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    step_id: Mapped[int] = mapped_column(ForeignKey("scenario_steps.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(255))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    hp_delta: Mapped[int] = mapped_column(Integer, default=0)
    hint: Mapped[str] = mapped_column(Text, nullable=True)
    consequence_text: Mapped[str] = mapped_column(Text)

    step = relationship("ScenarioStep", back_populates="decision_options")
    answers = relationship("AnswerEvent", back_populates="option")
