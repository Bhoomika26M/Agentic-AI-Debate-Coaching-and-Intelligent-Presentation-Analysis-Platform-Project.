import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    LEARNER = "Learner"
    DEBATE_COACH = "Debate Coach"
    EDUCATOR = "Educator"
    ADMINISTRATOR = "Administrator"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.LEARNER, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    debates_created = relationship("DebateSession", back_populates="creator", foreign_keys="DebateSession.creator_id")
    participations = relationship("DebateParticipant", back_populates="user")
    evaluations = relationship("DebateEvaluation", back_populates="user")
    argument_analyses = relationship("ArgumentAnalysis", back_populates="user")
    fallacy_detections = relationship("FallacyDetection", back_populates="user")
    counterarguments = relationship("Counterargument", back_populates="user")
    presentation_analyses = relationship("PresentationAnalysis", back_populates="user")
    coaching_recommendations = relationship("CoachingRecommendation", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    experience_level = Column(String(50), default="Intermediate")  # Novice, Intermediate, Advanced, Master
    preferred_debate_topics = Column(JSON, default=lambda: ["Technology & AI", "Ethics & Society", "Education", "Economics"])
    presentation_domains = Column(JSON, default=lambda: ["Keynote", "Debate & Rebuttal", "Pitch Presentation", "Academic Lecture"])
    learning_goals = Column(JSON, default=lambda: ["Eliminate logical fallacies", "Improve speech clarity", "Master evidence-based rebuttals"])
    coaching_preferences = Column(JSON, default=lambda: {"rigor": "High", "focus_areas": ["Evidence", "Logic", "Pacing"]})
    bio = Column(Text, default="Passionate debater and public speaker practicing structured argumentation and persuasive oratory.")
    institution = Column(String(255), default="Debate Academy International")
    
    # Dashboard counters & social stats matching UI
    total_debates = Column(Integer, default=7)
    debates_won = Column(Integer, default=1)
    rooms_hosted = Column(Integer, default=41)
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=2)

    user = relationship("User", back_populates="profile")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)  # argumentation, critical_thinking, communication, confidence, rebuttal_skills, presentation_skills
    score = Column(Integer, default=75)  # 0 to 100
    history = Column(JSON, default=list)  # [{"date": "...", "score": 70}, ...]
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="skills")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_name = Column(String(50), default="Pro Plan")  # Free, Pro Plan, Enterprise
    status = Column(String(50), default="Active")       # Active, Inactive, Pending
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="subscription")
