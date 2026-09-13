from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    format: Mapped[str] = mapped_column(Enum("one_on_one", "parliamentary", "oxford", "policy", "public_forum", "ai_simulation", name="debate_format"))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(Enum("scheduled", "active", "completed", "cancelled", name="debate_status"), default="scheduled")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="debates_created")
    participants = relationship("DebateParticipant", back_populates="debate", cascade="all, delete-orphan")


class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    position: Mapped[str] = mapped_column(Enum("for", "against", "neutral", name="participant_position"), default="neutral")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debate = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="debate_participations")
