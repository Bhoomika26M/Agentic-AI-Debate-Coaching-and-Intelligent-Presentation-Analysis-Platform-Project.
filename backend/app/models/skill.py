import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import Float, ForeignKey, Enum as SAEnum, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class SkillType(str, enum.Enum):
    clarity = "clarity"
    relevance = "relevance"
    evidence = "evidence"
    logic = "logic"
    persuasiveness = "persuasiveness"
    pace = "pace"
    confidence = "confidence"
    engagement = "engagement"


class SkillRecord(Base):
    __tablename__ = "skill_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_type: Mapped[SkillType] = mapped_column(
        SAEnum(SkillType, name="skilltype"), nullable=False
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    # Source: a session UUID string or "manual"
    source: Mapped[str | None] = mapped_column(String(255), nullable=True, default="manual")
