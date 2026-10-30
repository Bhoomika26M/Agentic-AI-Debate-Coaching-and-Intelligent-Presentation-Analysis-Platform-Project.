from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DebateCoachingRecord(Base):
    __tablename__ = "debate_coaching_records"
    __table_args__ = (
        UniqueConstraint("debate_id", "user_id", "source_argument_count", name="uq_debate_coaching_snapshot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    debate_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_assessment: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list] = mapped_column(JSON, nullable=False)
    weaknesses: Mapped[list] = mapped_column(JSON, nullable=False)
    improvement_suggestions: Mapped[list] = mapped_column(JSON, nullable=False)
    improvement_plan: Mapped[dict] = mapped_column(JSON, nullable=False)
    source_argument_count: Mapped[int] = mapped_column(nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, default="openai")
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    debate = relationship("DebateSession", back_populates="coaching_records")
    user = relationship("User", back_populates="debate_coaching_records")
