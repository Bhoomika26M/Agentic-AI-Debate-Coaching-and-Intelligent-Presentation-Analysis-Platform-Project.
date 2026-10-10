import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

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
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", uselist=False, cascade="all, delete-orphan")
    created_topics = relationship("DebateTopic", back_populates="creator", foreign_keys="DebateTopic.created_by")
    created_sessions = relationship("DebateSession", back_populates="creator", foreign_keys="DebateSession.created_by")
    participations = relationship("SessionParticipant", back_populates="user", cascade="all, delete-orphan")
