import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class DebateFormat:
    ONE_ON_ONE = "One-on-One"
    PARLIAMENTARY = "Parliamentary"
    OXFORD = "Oxford"
    POLICY = "Policy"
    PUBLIC_FORUM = "Public Forum"
    AI_SIMULATION = "AI Debate Simulation"

    ALL = [ONE_ON_ONE, PARLIAMENTARY, OXFORD, POLICY, PUBLIC_FORUM, AI_SIMULATION]

class SessionStatus:
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    ALL = [SCHEDULED, LIVE, COMPLETED, CANCELLED]

class ParticipantPosition:
    PROPOSITION = "proposition"
    OPPOSITION = "opposition"
    ADJUDICATOR = "adjudicator"
    OBSERVER = "observer"

    ALL = [PROPOSITION, OPPOSITION, ADJUDICATOR, OBSERVER]

class DebateTopic(Base):
    __tablename__ = "debate_topics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    motion_text = Column(Text, nullable=False)  # "This House Would..."
    category = Column(String(64), nullable=False)  # "AI & Technology", "Ethics", "Economics", etc.
    difficulty = Column(String(32), default="Intermediate", nullable=False)
    proposition_summary = Column(Text, nullable=True)
    opposition_summary = Column(Text, nullable=True)
    is_curated = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    sessions = relationship("DebateSession", back_populates="topic", cascade="all, delete-orphan")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id = Column(String(36), ForeignKey("debate_topics.id", ondelete="CASCADE"), nullable=False)
    format = Column(String(64), default=DebateFormat.AI_SIMULATION, nullable=False)
    status = Column(String(32), default=SessionStatus.LIVE, nullable=False)
    current_round = Column(Integer, default=1, nullable=False)
    turn_timer_seconds = Column(Integer, default=120, nullable=False)
    active_speaker_position = Column(String(32), default=ParticipantPosition.PROPOSITION, nullable=True)

    ai_opponent_difficulty = Column(String(32), default="Intermediate", nullable=True)
    ai_persona = Column(String(64), default="Socratic Questioner", nullable=True)

    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    topic = relationship("DebateTopic", back_populates="sessions")
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")
    turns = relationship("DebateTurn", back_populates="session", cascade="all, delete-orphan", order_by="DebateTurn.created_at")
    scores = relationship("PerformanceScore", back_populates="session", cascade="all, delete-orphan")
    feedback_reports = relationship("DebateFeedbackReport", back_populates="session", cascade="all, delete-orphan")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_ai = Column(Boolean, default=False, nullable=False)
    ai_persona = Column(String(64), nullable=True)
    position = Column(String(32), default=ParticipantPosition.PROPOSITION, nullable=False)
    speaker_order_index = Column(Integer, default=1, nullable=False)

    session = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="participations")


class DebateTurn(Base):
    __tablename__ = "debate_turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    speaker_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    speaker_position = Column(String(32), default=ParticipantPosition.PROPOSITION, nullable=False)
    round_number = Column(Integer, default=1, nullable=False)
    turn_type = Column(String(32), default="speech", nullable=False) # speech, ai_rebuttal, cross_examination
    speech_text = Column(Text, nullable=False)
    wpm = Column(Float, default=135.0, nullable=True)
    filler_word_count = Column(Integer, default=0, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("DebateSession", back_populates="turns")
    speaker = relationship("User", back_populates="turns")
    argument_findings = relationship("ArgumentFinding", back_populates="turn", cascade="all, delete-orphan")
    fallacy_findings = relationship("FallacyFinding", back_populates="turn", cascade="all, delete-orphan")
    rebuttal_suggestions = relationship("RebuttalSuggestion", back_populates="turn", cascade="all, delete-orphan")
