import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Float,
    Text,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from .database import Base


class RoleEnum(str, enum.Enum):
    learner = "learner"
    debate_coach = "debate_coach"
    educator = "educator"
    administrator = "administrator"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(RoleEnum), default=RoleEnum.learner, nullable=False)
    experience_level = Column(String, default="beginner")
    preferred_topics = Column(String, default="")
    learning_goals = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("DebateSession", back_populates="owner")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False)
    debate_format = Column(String, default="one_on_one")
    position = Column(String, default="for")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="sessions")
    arguments = relationship("Argument", back_populates="session")


class Argument(Base):
    __tablename__ = "arguments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DebateSession", back_populates="arguments")
    analysis = relationship(
        "AnalysisResult", back_populates="argument", uselist=False
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    argument_id = Column(Integer, ForeignKey("arguments.id"), nullable=False)

    clarity = Column(Float)
    relevance = Column(Float)
    evidence_strength = Column(Float)
    logical_consistency = Column(Float)
    persuasiveness = Column(Float)

    argument_quality_score = Column(Float)
    evidence_usage_score = Column(Float)
    logical_consistency_score = Column(Float)
    rebuttal_effectiveness_score = Column(Float)
    communication_skills_score = Column(Float)
    overall_score = Column(Float)

    fallacies_json = Column(Text, default="[]")
    counterarguments_json = Column(Text, default="[]")
    claims_json = Column(Text, default="[]")
    recommendations_json = Column(Text, default="[]")

    created_at = Column(DateTime, default=datetime.utcnow)

    argument = relationship("Argument", back_populates="analysis")
