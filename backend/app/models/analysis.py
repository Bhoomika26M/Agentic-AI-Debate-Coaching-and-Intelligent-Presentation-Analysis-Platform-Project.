import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("debate_sessions.id", ondelete="SET NULL"), nullable=True)
    argument_text: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class FallacyDetection(Base):
    __tablename__ = "fallacy_detections"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    argument_text: Mapped[str] = mapped_column(Text, nullable=False)
    fallacies_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CounterArgument(Base):
    __tablename__ = "counterarguments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    claim: Mapped[str] = mapped_column(Text, nullable=False)
    counterarguments_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class PresentationSession(Base):
    __tablename__ = "presentation_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    input_type: Mapped[str] = mapped_column(String(10), default="text")  # text / audio
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("presentation_sessions.id", ondelete="CASCADE"), index=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    words_per_minute: Mapped[float | None] = mapped_column(Float, nullable=True)
    filler_word_count: Mapped[int] = mapped_column(Integer, default=0)
    analysis_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class PerformanceEvaluation(Base):
    __tablename__ = "performance_evaluations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("debate_sessions.id", ondelete="SET NULL"), nullable=True)
    argument_quality: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_usage: Mapped[float] = mapped_column(Float, default=0.0)
    logical_consistency: Mapped[float] = mapped_column(Float, default=0.0)
    rebuttal_effectiveness: Mapped[float] = mapped_column(Float, default=0.0)
    communication_skills: Mapped[float] = mapped_column(Float, default=0.0)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    weaknesses: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CoachingRecommendation(Base):
    __tablename__ = "coaching_recommendations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recommendations_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))