from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ProfileBase(BaseModel):
    experience_level: str = "Novice"
    preferred_topics: List[str] = Field(default_factory=list)
    presentation_domains: List[str] = Field(default_factory=list)
    learning_goals: str = ""
    coaching_preferences: str = "Socratic & Constructive"
    bio: str = ""

class ProfileUpdate(BaseModel):
    experience_level: Optional[str] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[str] = None
    coaching_preferences: Optional[str] = None
    bio: Optional[str] = None

class ProfileRead(ProfileBase):
    id: str
    user_id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSkillBase(BaseModel):
    argument_quality: float = 50.0
    evidence_usage: float = 50.0
    logical_consistency: float = 50.0
    rebuttal_effectiveness: float = 50.0
    communication_skills: float = 50.0
    speech_pace_wpm: float = 135.0
    confidence_score: float = 60.0
    debates_completed: int = 0

class UserSkillUpdate(BaseModel):
    argument_quality: Optional[float] = None
    evidence_usage: Optional[float] = None
    logical_consistency: Optional[float] = None
    rebuttal_effectiveness: Optional[float] = None
    communication_skills: Optional[float] = None
    speech_pace_wpm: Optional[float] = None
    confidence_score: Optional[float] = None
    debates_completed: Optional[int] = None

class UserSkillRead(UserSkillBase):
    id: str
    user_id: str
    updated_at: datetime
    overall_performance_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
