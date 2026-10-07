import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    topic:        Mapped[str]        = mapped_column(String(500))
    format:       Mapped[str]        = mapped_column(String(60))
    position:     Mapped[str | None] = mapped_column(String(60),   nullable=True)
    notes:        Mapped[str | None] = mapped_column(Text,          nullable=True)
    status:       Mapped[str]        = mapped_column(String(20),    default="scheduled")
    scheduled_at: Mapped[datetime]   = mapped_column(DateTime(timezone=True))
    round_count:  Mapped[int]        = mapped_column(default=1)
    duration_minutes: Mapped[int]    = mapped_column(default=15)

    # Content & Recording
    transcript:          Mapped[str | None]  = mapped_column(Text, nullable=True)
    recording_url:       Mapped[str | None]  = mapped_column(String(500), nullable=True)
    key_arguments:       Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)

    # Outcome & Evaluation fields (set after session or by coach/educator)
    score:               Mapped[float | None] = mapped_column(nullable=True)
    feedback_summary:    Mapped[str | None]   = mapped_column(Text, nullable=True)
    evaluation_criteria: Mapped[dict | None]  = mapped_column(JSON, nullable=True, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    user = relationship("User", backref="sessions", lazy="selectin")

    def __repr__(self) -> str:
        return f"<DebateSession {self.topic[:40]} [{self.status}]>"
