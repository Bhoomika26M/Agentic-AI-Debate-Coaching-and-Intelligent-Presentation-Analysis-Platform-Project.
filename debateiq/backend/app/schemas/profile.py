from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ProfileBase(BaseModel):
    experience_level: str = "Novice"
    preferred_topics: List[str] = Field(default_factory=list)
    presentation_domains: List[str] = Field(default_factory=list)
    coaching_preferences: str = "Socratic & Balanced"
    bio: Optional[str] = None

class ProfileUpdate(BaseModel):
    experience_level: Optional[str] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    coaching_preferences: Optional[str] = None
    bio: Optional[str] = None

class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    debater_xp: int
    debater_level: int
    badges: List[str]
    streak_days: int
    updated_at: datetime

    class Config:
        from_attributes = True

class SkillUpdate(BaseModel):
    clarity_score: Optional[float] = None
    reasoning_score: Optional[float] = None
    evidence_score: Optional[float] = None
    rebuttal_score: Optional[float] = None
    delivery_score: Optional[float] = None

class SkillResponse(BaseModel):
    id: str
    user_id: str
    clarity_score: float
    reasoning_score: float
    evidence_score: float
    rebuttal_score: float
    delivery_score: float
    total_debates_count: int
    total_speeches_count: int
    average_wpm: float
    filler_words_per_min: float
    confidence_index: float
    last_evaluated_at: datetime

    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    target_score: Optional[float] = Field(default=85.0, ge=0.0, le=100.0)
    category: str = "Argumentation"
    deadline: Optional[datetime] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_score: Optional[float] = None
    current_score: Optional[float] = None
    is_completed: Optional[bool] = None
    deadline: Optional[datetime] = None

class GoalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    target_score: float
    current_score: float
    category: str
    is_completed: bool
    deadline: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
