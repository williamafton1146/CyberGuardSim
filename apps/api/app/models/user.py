from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120))
    security_rating: Mapped[int] = mapped_column(Integer, default=0)
    league: Mapped[str] = mapped_column(String(50), default="Новичок")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="user", uselist=False, cascade="all, delete-orphan")
