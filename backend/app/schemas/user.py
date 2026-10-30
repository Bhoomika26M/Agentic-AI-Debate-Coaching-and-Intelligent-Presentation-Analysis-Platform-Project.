from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.user import UserRole

class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole = UserRole.LEARNER

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Any

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_debate_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    coaching_preferences: Optional[Dict[str, Any]] = None

class UserSkillOut(BaseModel):
    id: int
    skill_name: str
    score: int
    history: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class UserProfileOut(BaseModel):
    experience_level: str
    preferred_debate_topics: List[str]
    presentation_domains: List[str]
    learning_goals: List[str]
    coaching_preferences: Dict[str, Any]
    bio: Optional[str]
    institution: Optional[str]
    total_debates: int
    debates_won: int
    rooms_hosted: int
    followers_count: int
    following_count: int

    class Config:
        from_attributes = True

class SubscriptionOut(BaseModel):
    plan_name: str
    status: str
    current_period_end: Optional[datetime]

    class Config:
        from_attributes = True

class UserOut(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    profile: Optional[UserProfileOut] = None
    skills: List[UserSkillOut] = []
    subscription: Optional[SubscriptionOut] = None

    class Config:
        from_attributes = True
