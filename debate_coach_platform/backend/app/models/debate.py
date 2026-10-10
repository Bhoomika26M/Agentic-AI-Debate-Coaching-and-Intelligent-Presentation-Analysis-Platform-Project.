import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class DebateFormat:
    ONE_ON_ONE = "One-on-One Debate"
    PARLIAMENTARY = "Parliamentary Debate"
    OXFORD = "Oxford Debate"
    POLICY = "Policy Debate"
    PUBLIC_FORUM = "Public Forum Debate"
    AI_SIMULATION = "AI Debate Simulation"

    ALL = [
        ONE_ON_ONE,
        PARLIAMENTARY,
        OXFORD,
        POLICY,
        PUBLIC_FORUM,
        AI_SIMULATION
    ]

class SessionStatus:
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    ALL = [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]

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
    motion_text = Column(Text, nullable=False)  # "This House Believes..."
    category = Column(String(64), nullable=False)  # "Ethics", "AI & Technology", "Economics", etc.
    difficulty_level = Column(String(32), default="Intermediate", nullable=False)
    proposition_stance = Column(Text, nullable=True)
    opposition_stance = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User", back_populates="created_topics", foreign_keys=[created_by])
    sessions = relationship("DebateSession", back_populates="topic", cascade="all, delete-orphan")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_id = Column(String(36), ForeignKey("debate_topics.id", ondelete="CASCADE"), nullable=False)
    debate_format = Column(String(64), default=DebateFormat.OXFORD, nullable=False)
    session_title = Column(String(200), nullable=False)
    status = Column(String(32), default=SessionStatus.SCHEDULED, nullable=False)
    scheduled_start = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    topic = relationship("DebateTopic", back_populates="sessions")
    creator = relationship("User", back_populates="created_sessions", foreign_keys=[created_by])
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    position = Column(String(32), default=ParticipantPosition.PROPOSITION, nullable=False)
    speaking_order = Column(Integer, default=1, nullable=False)
    score_awarded = Column(Float, nullable=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="participations")
