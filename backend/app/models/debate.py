import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class DebateSession(Base):
    __tablename__ = "debate_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    format: Mapped[str] = mapped_column(String(50), default="one_on_one")
    position: Mapped[str] = mapped_column(String(20), nullable=False)  # FOR / AGAINST
    difficulty: Mapped[str] = mapped_column(String(20), default="intermediate")
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / completed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["DebateMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="DebateMessage.turn_number"
    )

class DebateMessage(Base):
    __tablename__ = "debate_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    sender: Mapped[str] = mapped_column(String(10), nullable=False)  # user / ai
    content: Mapped[str] = mapped_column(Text, nullable=False)
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session: Mapped[DebateSession] = relationship(back_populates="messages")