from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DebateSession(Base):
    __tablename__ = "debate_sessions"
    __table_args__ = (
        UniqueConstraint("created_by", "request_key", name="uq_debate_request_key"),
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    topic: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    format: Mapped[str] = mapped_column(Enum("one_on_one", "parliamentary", "oxford", "policy", "public_forum", "ai_simulation", name="debate_format"))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(Enum("scheduled", "active", "completed", "cancelled", name="debate_status"), default="scheduled")
    ai_opponent: Mapped[bool] = mapped_column(default=False, server_default="false")
    request_key: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="debates_created")
    participants = relationship("DebateParticipant", back_populates="debate", cascade="all, delete-orphan")
    arguments = relationship("DebateArgument", back_populates="debate", cascade="all, delete-orphan")
    argument_analyses = relationship("ArgumentAnalysis", back_populates="debate_session")
    coaching_records = relationship("DebateCoachingRecord", back_populates="debate", cascade="all, delete-orphan")


class DebateParticipant(Base):
    __tablename__ = "debate_participants"
    __table_args__ = (
        UniqueConstraint("debate_id", "user_id", name="uq_debate_participant_membership"),
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    position: Mapped[str] = mapped_column(Enum("for", "against", "neutral", name="participant_position"), default="neutral")
    is_ai: Mapped[bool] = mapped_column(default=False, server_default="false")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debate = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="debate_participations")

    @property
    def display_name(self) -> str:
        if self.is_ai:
            return "AI Debate Coach"
        if self.user is not None:
            return self.user.name
        return f"User #{self.user_id}"


class DebateArgument(Base):
    __tablename__ = "debate_arguments"
    __table_args__ = (
        UniqueConstraint("debate_id", "turn_order", name="uq_debate_argument_turn_order"),
        UniqueConstraint("debate_id", "user_id", "request_key", name="uq_debate_argument_request_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    turn_order: Mapped[int] = mapped_column(Integer, nullable=False)
    request_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    position: Mapped[str] = mapped_column(Enum("for", "against", "neutral", name="argument_position"), default="neutral")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_ai: Mapped[bool] = mapped_column(default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debate = relationship("DebateSession", back_populates="arguments")
    user = relationship("User", back_populates="debate_arguments")

    @property
    def author_name(self) -> str:
        if self.is_ai:
            return "AI Debate Coach"
        if self.user is not None:
            return self.user.name
        return f"User #{self.user_id}"

    @property
    def role(self) -> str:
        return "opponent" if self.is_ai else "user"
