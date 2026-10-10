import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # User Profile Information
    experience_level = Column(String(32), default="Novice", nullable=False)  # Novice, Intermediate, Advanced, Champion
    preferred_topics = Column(JSON, default=list, nullable=False)             # ["Ethics", "AI & Technology", "Economics"]
    presentation_domains = Column(JSON, default=list, nullable=False)         # ["Keynote", "Pitch", "Oxford Debate"]
    learning_goals = Column(Text, default="", nullable=False)
    coaching_preferences = Column(String(64), default="Socratic & Constructive", nullable=False)
    bio = Column(Text, default="", nullable=False)
    
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="profile")


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Core Communication & Debate Skills (0 - 100)
    argument_quality = Column(Float, default=50.0, nullable=False)        # 30% weight in model
    evidence_usage = Column(Float, default=50.0, nullable=False)          # 20% weight in model
    logical_consistency = Column(Float, default=50.0, nullable=False)     # 20% weight in model
    rebuttal_effectiveness = Column(Float, default=50.0, nullable=False)  # 15% weight in model
    communication_skills = Column(Float, default=50.0, nullable=False)    # 15% weight in model
    
    # Speech & Presentation Analytics
    speech_pace_wpm = Column(Float, default=135.0, nullable=False)        # Words per minute (130-160 optimal)
    confidence_score = Column(Float, default=60.0, nullable=False)        # 0 - 100
    debates_completed = Column(Integer, default=0, nullable=False)
    
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="skills")
