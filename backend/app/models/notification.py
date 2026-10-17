import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class NotificationType:
    DEBATE_REMINDER = "debate_reminder"
    COACHING_FEEDBACK = "coaching_feedback"
    PRACTICE_REMINDER = "practice_reminder"
    SKILL_MILESTONE = "skill_milestone"
    ANNOUNCEMENT = "announcement"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )

    title:      Mapped[str]         = mapped_column(String(200))
    message:    Mapped[str]         = mapped_column(Text)
    type:       Mapped[str]         = mapped_column(String(50), default=NotificationType.ANNOUNCEMENT)
    link:       Mapped[str | None]  = mapped_column(String(255), nullable=True)
    is_read:    Mapped[bool]        = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", backref="notifications", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Notification {self.title[:30]} [{self.type}]>"
