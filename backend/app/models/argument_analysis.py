from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    debate_session_id: Mapped[int | None] = mapped_column(ForeignKey("debate_sessions.id", ondelete="SET NULL"), nullable=True)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    argument_text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(25), default="completed", nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    claims: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    evidence: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    reasoning_assessment: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    detected_fallacies: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    scores: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    improvement_suggestions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    feedback_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="argument_analyses")
    debate_session = relationship("DebateSession", back_populates="argument_analyses")
