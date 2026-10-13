import uuid
from datetime import datetime, date
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict

from app.models.profile import ExperienceLevel, GoalStatus


# ─── User Profile ────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    experience_level: Optional[ExperienceLevel] = None
    preferred_debate_topics: Optional[list[str]] = None
    presentation_domains: Optional[list[str]] = None
    coaching_preferences: Optional[dict[str, Any]] = None
    bio: Optional[str] = None


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    experience_level: Optional[ExperienceLevel]
    preferred_debate_topics: Optional[list]
    presentation_domains: Optional[list]
    coaching_preferences: Optional[dict]
    bio: Optional[str]
    updated_at: datetime


# ─── Learning Goals ───────────────────────────────────────────────────────────

class LearningGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: GoalStatus = GoalStatus.not_started


class LearningGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[GoalStatus] = None


class LearningGoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    target_date: Optional[date]
    status: GoalStatus
    created_at: datetime
    updated_at: datetime
