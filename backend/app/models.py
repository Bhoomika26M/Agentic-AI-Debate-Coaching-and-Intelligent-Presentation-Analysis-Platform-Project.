from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[str] = mapped_column(Text, default="")
    role: Mapped[str] = mapped_column(String(30), default="learner")
    experience_level: Mapped[str] = mapped_column(String(30), default="beginner")
    preferred_debate_topics: Mapped[str] = mapped_column(Text, default="[]")
    presentation_domains: Mapped[str] = mapped_column(Text, default="[]")
    learning_goals: Mapped[str] = mapped_column(Text, default="[]")
    coaching_preferences: Mapped[str] = mapped_column(Text, default="{}")
    tracked_skills: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sessions = relationship("DebateSession", back_populates="user", cascade="all, delete-orphan")


class DebateSession(Base):
    __tablename__ = "debate_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(500))
    position: Mapped[str] = mapped_column(String(20), default="for")
    debate_format: Mapped[str] = mapped_column(String(30), default="one_on_one")
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    transcript: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="completed")
    overall_score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="sessions")
    analyses = relationship("Analysis", back_populates="session", cascade="all, delete-orphan")
    turns = relationship("DebateTurn", back_populates="session", cascade="all, delete-orphan")


class DebateTurn(Base):
    __tablename__ = "debate_turns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id"), index=True)
    turn_number: Mapped[int] = mapped_column(Integer)
    speaker: Mapped[str] = mapped_column(String(20))
    turn_type: Mapped[str] = mapped_column(String(30), default="challenge")
    content: Mapped[str] = mapped_column(Text)
    evaluation: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    session = relationship("DebateSession", back_populates="turns")


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id"))
    clarity: Mapped[float] = mapped_column(Float, default=0)
    evidence: Mapped[float] = mapped_column(Float, default=0)
    persuasiveness: Mapped[float] = mapped_column(Float, default=0)
    delivery: Mapped[float] = mapped_column(Float, default=0)
    fallacies: Mapped[str] = mapped_column(Text, default="[]")
    counterarguments: Mapped[str] = mapped_column(Text, default="[]")
    recommendations: Mapped[str] = mapped_column(Text, default="[]")
    pacing_wpm: Mapped[float] = mapped_column(Float, default=0)
    filler_words: Mapped[int] = mapped_column(Integer, default=0)
    session = relationship("DebateSession", back_populates="analyses")


class MediaAsset(Base):
    __tablename__ = "media_assets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))
    media_type: Mapped[str] = mapped_column(String(30))
    content_type: Mapped[str] = mapped_column(String(120))
    size_bytes: Mapped[int] = mapped_column(Integer)
    transcript: Mapped[str] = mapped_column(Text, default="")
    analysis_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(30), default="analyzed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Presentation(Base):
    __tablename__ = "presentations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    audience: Mapped[str] = mapped_column(String(100), default="general")
    transcript: Mapped[str] = mapped_column(Text)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0)
    analysis_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClassGroup(Base):
    __tablename__ = "class_groups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    educator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClassMember(Base):
    __tablename__ = "class_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id"), index=True)
    learner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LearningAssignment(Base):
    __tablename__ = "learning_assignments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    learner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    assignment_type: Mapped[str] = mapped_column(String(40), default="debate")
    instructions: Mapped[str] = mapped_column(Text, default="")
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="assigned")
    submission: Mapped[str] = mapped_column(Text, default="")
    evaluation: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FallacyFinding(Base):
    __tablename__ = "fallacy_findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("debate_sessions.id"), nullable=True)
    fallacy_type: Mapped[str] = mapped_column(String(80))
    excerpt: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    correction: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CounterargumentPractice(Base):
    __tablename__ = "counterargument_practice"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    claim: Mapped[str] = mapped_column(Text)
    counter_type: Mapped[str] = mapped_column(String(50))
    response: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="generated")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(120))
    target: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(120))
    operation: Mapped[str] = mapped_column(String(80))
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CurriculumItem(Base):
    __tablename__ = "curriculum_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    educator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    module: Mapped[str] = mapped_column(String(100), default="debate")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
