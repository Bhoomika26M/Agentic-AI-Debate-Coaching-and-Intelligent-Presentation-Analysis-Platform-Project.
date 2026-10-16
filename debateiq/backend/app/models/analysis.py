import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ArgumentFinding(Base):
    __tablename__ = "argument_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    turn_id = Column(String(36), ForeignKey("debate_turns.id", ondelete="CASCADE"), nullable=True)

    claim = Column(Text, nullable=False)
    premises = Column(JSON, default=list, nullable=False)
    evidence = Column(JSON, default=list, nullable=False)

    # 5-Criteria Rubric Scores (0 - 100)
    clarity_score = Column(Float, default=70.0, nullable=False)
    relevance_score = Column(Float, default=70.0, nullable=False)
    evidence_score = Column(Float, default=70.0, nullable=False)
    logic_score = Column(Float, default=70.0, nullable=False)
    persuasion_score = Column(Float, default=70.0, nullable=False)
    overall_score = Column(Float, default=70.0, nullable=False)

    strengths = Column(JSON, default=list, nullable=False)
    weaknesses = Column(JSON, default=list, nullable=False)
    suggestions = Column(JSON, default=list, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    turn = relationship("DebateTurn", back_populates="argument_findings")


class FallacyFinding(Base):
    __tablename__ = "fallacy_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    turn_id = Column(String(36), ForeignKey("debate_turns.id", ondelete="CASCADE"), nullable=True)

    fallacy_type = Column(String(64), nullable=False) # Ad Hominem, Straw Man, etc.
    excerpt_text = Column(Text, nullable=False)
    span_start = Column(Integer, default=0, nullable=False)
    span_end = Column(Integer, default=0, nullable=False)
    confidence = Column(Float, default=0.90, nullable=False)
    severity = Column(String(32), default="Medium", nullable=False)
    explanation = Column(Text, nullable=False)
    corrected_rewrite = Column(Text, nullable=False)
    credibility_impact = Column(Float, default=-10.0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    turn = relationship("DebateTurn", back_populates="fallacy_findings")


class RebuttalSuggestion(Base):
    __tablename__ = "rebuttal_suggestions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    turn_id = Column(String(36), ForeignKey("debate_turns.id", ondelete="CASCADE"), nullable=True)

    perspective = Column(String(64), default="Logical", nullable=False) # Logical, Evidence-Based, Ethical, Practical, Policy
    target_argument = Column(Text, nullable=False)
    counter_thesis = Column(Text, nullable=False)
    premises = Column(JSON, default=list, nullable=False)
    suggested_evidence = Column(Text, default="", nullable=False)
    challenge_question = Column(Text, default="", nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    turn = relationship("DebateTurn", back_populates="rebuttal_suggestions")


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Exact Weighted Model: 30% Arg + 20% Ev + 20% Log + 15% Reb + 15% Comm
    overall_score = Column(Float, default=70.0, nullable=False)
    argument_quality_score = Column(Float, default=70.0, nullable=False)
    evidence_score = Column(Float, default=70.0, nullable=False)
    logical_consistency_score = Column(Float, default=70.0, nullable=False)
    rebuttal_score = Column(Float, default=70.0, nullable=False)
    communication_score = Column(Float, default=70.0, nullable=False)
    critical_thinking_score = Column(Float, default=70.0, nullable=False)
    raw_metrics = Column(JSON, default=dict, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("DebateSession", back_populates="scores")
    user = relationship("User", back_populates="scores")


class DebateFeedbackReport(Base):
    __tablename__ = "debate_feedback_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    executive_summary = Column(Text, nullable=False)
    overall_performance_score = Column(Float, default=70.0, nullable=False)
    credibility_index = Column(Float, default=90.0, nullable=False)

    key_strengths = Column(JSON, default=list, nullable=False)
    critical_vulnerabilities = Column(JSON, default=list, nullable=False)
    coaching_drills_prescribed = Column(JSON, default=list, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("DebateSession", back_populates="feedback_reports")
    user = relationship("User", back_populates="feedback_reports")


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    target_skill = Column(String(64), nullable=False)
    focus_areas = Column(JSON, default=list, nullable=False)
    milestone_goals = Column(JSON, default=list, nullable=False)
    prescribed_drills = Column(JSON, default=list, nullable=False)
    status = Column(String(32), default="active", nullable=False)
    progress_percentage = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="learning_plans")
