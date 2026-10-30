import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class DebateFormat(str, enum.Enum):
    ONE_ON_ONE = "One-on-One Debate"
    PARLIAMENTARY = "Parliamentary Debate"
    OXFORD = "Oxford Debate"
    POLICY = "Policy Debate"
    PUBLIC_FORUM = "Public Forum Debate"
    AI_SIMULATION = "AI Debate Simulation"

class DebateStatus(str, enum.Enum):
    SCHEDULED = "Scheduled"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class DebatePosition(str, enum.Enum):
    FOR = "For"
    AGAINST = "Against"

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    topic = Column(Text, nullable=False)
    format = Column(Enum(DebateFormat), default=DebateFormat.AI_SIMULATION, nullable=False)
    difficulty = Column(String(50), default="Intermediate")  # Novice, Intermediate, Advanced, Master
    duration_minutes = Column(Integer, default=15)
    user_position = Column(Enum(DebatePosition), default=DebatePosition.FOR)
    ai_position = Column(Enum(DebatePosition), default=DebatePosition.AGAINST)
    status = Column(Enum(DebateStatus), default=DebateStatus.IN_PROGRESS)
    winner = Column(String(50), default="Pending")  # For, Against, Tie, Undecided
    
    current_round = Column(Integer, default=1)
    max_rounds = Column(Integer, default=4)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    creator = relationship("User", back_populates="debates_created", foreign_keys=[creator_id])
    messages = relationship("DebateMessage", back_populates="debate", cascade="all, delete-orphan", order_by="DebateMessage.id")
    evaluation = relationship("DebateEvaluation", back_populates="debate", uselist=False, cascade="all, delete-orphan")
    participants = relationship("DebateParticipant", back_populates="debate", cascade="all, delete-orphan")

class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id = Column(Integer, primary_key=True, index=True)
    debate_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    position = Column(Enum(DebatePosition), nullable=False)
    is_ai = Column(Boolean, default=False)
    role_name = Column(String(100), default="Speaker")

    debate = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="participations")

class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id = Column(Integer, primary_key=True, index=True)
    debate_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, default=1)
    sender_type = Column(String(20), nullable=False)  # "user", "ai", "moderator"
    sender_name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Real-time round analysis/critique
    instant_critique = Column(JSON, nullable=True)

    debate = relationship("DebateSession", back_populates="messages")

class DebateEvaluation(Base):
    __tablename__ = "debate_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    debate_id = Column(Integer, ForeignKey("debate_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Weighted Scoring Formula:
    # Argument Quality: 30%
    # Evidence Usage: 20%
    # Logical Consistency: 20%
    # Rebuttal Effectiveness: 15%
    # Communication Skills: 15%
    argument_quality = Column(Float, default=0.0)
    evidence_usage = Column(Float, default=0.0)
    logical_consistency = Column(Float, default=0.0)
    rebuttal_effectiveness = Column(Float, default=0.0)
    communication_skills = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)  # Calculated weighted score

    winner = Column(String(50), default="Tie")
    summary = Column(Text, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    actionable_feedback = Column(JSON, default=list)
    rubric_breakdown = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    debate = relationship("DebateSession", back_populates="evaluation")
    user = relationship("User", back_populates="evaluations")
