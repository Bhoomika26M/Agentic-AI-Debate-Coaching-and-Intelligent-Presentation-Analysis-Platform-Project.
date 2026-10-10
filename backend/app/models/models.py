import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum, Table, JSON
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import (
    UserRole, ExperienceLevel, SkillCategory, GoalStatus,
    TopicDifficulty, DebateFormat, SessionStatus, ParticipantPosition, RecordingType
)

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="userrole_enum"), default=UserRole.LEARNER, nullable=False, index=True)
    oauth_provider = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("LearningGoal", back_populates="user", cascade="all, delete-orphan")
    created_topics = relationship("DebateTopic", back_populates="creator")
    created_sessions = relationship("DebateSession", foreign_keys="DebateSession.created_by", back_populates="creator")
    coached_sessions = relationship("DebateSession", foreign_keys="DebateSession.coach_id", back_populates="coach")
    session_participations = relationship("SessionParticipant", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    experience_level = Column(SQLEnum(ExperienceLevel, name="experiencelevel_enum"), default=ExperienceLevel.BEGINNER, nullable=False)
    # Stored as JSON list for cross-DB compatibility (Postgres JSON / SQLite support)
    preferred_topics = Column(JSON, default=list, nullable=False)
    presentation_domains = Column(JSON, default=list, nullable=False)
    coaching_style = Column(String(100), nullable=True)
    learning_goals = Column(Text, nullable=True)

    user = relationship("User", back_populates="profile")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(SQLEnum(SkillCategory, name="skillcategory_enum"), nullable=False, index=True)
    description = Column(Text, nullable=True)

    user_skills = relationship("UserSkill", back_populates="skill", cascade="all, delete-orphan")


class UserSkill(Base):
    __tablename__ = "user_skills"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    level = Column(Integer, default=50, nullable=False)  # 0 - 100
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="skills")
    skill = relationship("Skill", back_populates="user_skills")


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    target_date = Column(DateTime, nullable=True)
    status = Column(SQLEnum(GoalStatus, name="goalstatus_enum"), default=GoalStatus.NOT_STARTED, nullable=False)
    progress = Column(Integer, default=0, nullable=False)  # 0 - 100
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="goals")


class DebateTopic(Base):
    __tablename__ = "debate_topics"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    difficulty = Column(SQLEnum(TopicDifficulty, name="topicdifficulty_enum"), default=TopicDifficulty.INTERMEDIATE, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="created_topics")
    sessions = relationship("DebateSession", back_populates="topic")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    topic_id = Column(String(36), ForeignKey("debate_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    format = Column(SQLEnum(DebateFormat, name="debateformat_enum"), default=DebateFormat.ONE_ON_ONE, nullable=False)
    status = Column(SQLEnum(SessionStatus, name="sessionstatus_enum"), default=SessionStatus.SCHEDULED, nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    duration_min = Column(Integer, default=45, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    coach_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    topic = relationship("DebateTopic", back_populates="sessions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_sessions")
    coach = relationship("User", foreign_keys=[coach_id], back_populates="coached_sessions")
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")
    recordings = relationship("SessionRecording", back_populates="session", cascade="all, delete-orphan")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    position = Column(SQLEnum(ParticipantPosition, name="participantposition_enum"), default=ParticipantPosition.PROPOSITION, nullable=False)
    speaker_order = Column(Integer, default=1, nullable=False)

    session = relationship("DebateSession", back_populates="participants")
    user = relationship("User", back_populates="session_participations")


class SessionRecording(Base):
    __tablename__ = "session_recordings"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String(36), ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)
    type = Column(SQLEnum(RecordingType, name="recordingtype_enum"), default=RecordingType.AUDIO, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("DebateSession", back_populates="recordings")
