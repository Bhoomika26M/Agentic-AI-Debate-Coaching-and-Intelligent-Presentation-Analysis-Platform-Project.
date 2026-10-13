from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import ExperienceLevel, SkillCategory, GoalStatus

# ==================== PROFILE SCHEMAS ====================
class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    coaching_style: Optional[str] = None
    learning_goals: Optional[str] = None

class ProfileResponse(BaseModel):
    user_id: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    experience_level: ExperienceLevel
    preferred_topics: List[str] = []
    presentation_domains: List[str] = []
    coaching_style: Optional[str] = None
    learning_goals: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== SKILL SCHEMAS ====================
class SkillResponse(BaseModel):
    id: str
    name: str
    category: SkillCategory
    description: Optional[str] = None

    class Config:
        from_attributes = True

class UserSkillResponse(BaseModel):
    skill_id: str
    skill_name: str
    category: SkillCategory
    level: int  # 0 to 100
    updated_at: datetime

    class Config:
        from_attributes = True

class UserSkillUpdate(BaseModel):
    skill_id: str
    level: int = Field(..., ge=0, le=100, description="Skill mastery level between 0 and 100")


# ==================== GOAL SCHEMAS ====================
class GoalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    target_date: Optional[datetime] = None
    status: Optional[GoalStatus] = GoalStatus.NOT_STARTED
    progress: Optional[int] = Field(0, ge=0, le=100)

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    target_date: Optional[datetime] = None
    status: Optional[GoalStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)

class GoalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    target_date: Optional[datetime] = None
    status: GoalStatus
    progress: int
    created_at: datetime

    class Config:
        from_attributes = True