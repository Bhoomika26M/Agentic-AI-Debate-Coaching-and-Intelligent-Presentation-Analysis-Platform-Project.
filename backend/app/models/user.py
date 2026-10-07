import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class UserRole:
    LEARNER  = "learner"
    COACH    = "coach"
    EDUCATOR = "educator"
    ADMIN    = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    full_name: Mapped[str]  = mapped_column(String(120))
    email:     Mapped[str]  = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role:      Mapped[str]  = mapped_column(String(20), default=UserRole.LEARNER)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Profile fields
    bio:                  Mapped[str | None]  = mapped_column(String(500),  nullable=True)
    experience_level:     Mapped[str | None]  = mapped_column(String(30),   nullable=True, default="Beginner")
    debate_topics:        Mapped[list | None] = mapped_column(JSON,         nullable=True, default=list)
    presentation_domains: Mapped[list | None] = mapped_column(JSON,         nullable=True, default=list)
    learning_goals:       Mapped[list | None] = mapped_column(JSON,         nullable=True, default=list)
    coaching_prefs:       Mapped[list | None] = mapped_column(JSON,         nullable=True, default=list)

    # Skill tracking & History
    communication_skills: Mapped[dict | None] = mapped_column(JSON,         nullable=True, default=dict)
    presentation_history: Mapped[list | None] = mapped_column(JSON,         nullable=True, default=list)
    total_sessions:       Mapped[int]         = mapped_column(default=0)
    avg_score:            Mapped[float]       = mapped_column(default=0.0)
    win_streak:           Mapped[int]         = mapped_column(default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"
