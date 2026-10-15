import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="learner", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    experience_level: Mapped[str] = mapped_column(String(20), default="beginner")
    preferred_topics: Mapped[list] = mapped_column(JSON, default=list)
    presentation_domains: Mapped[list] = mapped_column(JSON, default=list)
    learning_goals: Mapped[list] = mapped_column(JSON, default=list)
    coaching_preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped[User] = relationship(back_populates="profile")