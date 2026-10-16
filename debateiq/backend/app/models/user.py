import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole:
    LEARNER = "Learner"
    COACH = "Debate Coach"
    EDUCATOR = "Educator"
    ADMIN = "Administrator"

    ALL = [LEARNER, COACH, EDUCATOR, ADMIN]

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(32), default=UserRole.LEARNER, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", uselist=False, cascade="all, delete-orphan")
    goals = relationship("LearningGoal", back_populates="user", cascade="all, delete-orphan")
    participations = relationship("SessionParticipant", back_populates="user", cascade="all, delete-orphan")
    turns = relationship("DebateTurn", back_populates="speaker")
    scores = relationship("PerformanceScore", back_populates="user", cascade="all, delete-orphan")
    feedback_reports = relationship("DebateFeedbackReport", back_populates="user", cascade="all, delete-orphan")
    learning_plans = relationship("LearningPlan", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    experience_level = Column(String(32), default="Novice", nullable=False) # Novice, Intermediate, Advanced, Champion
    preferred_topics = Column(JSON, default=list, nullable=False)
    presentation_domains = Column(JSON, default=list, nullable=False)
    coaching_preferences = Column(String(64), default="Socratic & Balanced", nullable=False)
    bio = Column(Text, default="", nullable=True)

    # Gamification
    debater_xp = Column(Integer, default=0, nullable=False)
    debater_level = Column(Integer, default=1, nullable=False)
    badges = Column(JSON, default=list, nullable=False)
    streak_days = Column(Integer, default=1, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="profile")


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # 5 Key Communication & Reasoning Pillars (0 - 100)
    clarity_score = Column(Float, default=70.0, nullable=False)
    reasoning_score = Column(Float, default=70.0, nullable=False)
    evidence_score = Column(Float, default=70.0, nullable=False)
    rebuttal_score = Column(Float, default=70.0, nullable=False)
    delivery_score = Column(Float, default=70.0, nullable=False)

    total_debates_count = Column(Integer, default=0, nullable=False)
    total_speeches_count = Column(Integer, default=0, nullable=False)
    average_wpm = Column(Float, default=135.0, nullable=False)
    filler_words_per_min = Column(Float, default=1.0, nullable=False)
    confidence_index = Column(Float, default=75.0, nullable=False)
    last_evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="skills")


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text, default="", nullable=True)
    category = Column(String(64), default="Argumentation", nullable=False)
    target_score = Column(Float, default=85.0, nullable=False)
    current_score = Column(Float, default=70.0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="goals")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(32), default="info", nullable=False)  # info, score, badge, challenge
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="notifications")
