from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    full_name: str
    experience_level: Optional[str] = "Beginner"
    preferred_debate_topics: Optional[str] = "Technology, Ethics, Society"
    presentation_domains: Optional[str] = "Business, Academic, Keynote"
    learning_goals: Optional[str] = "Master rebuttals, avoid fallacies, improve pacing"
    coaching_preferences: Optional[str] = "Analytical & Constructive"
    role: Optional[str] = "learner"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserProfileSchema(BaseModel):
    avatar_url: Optional[str] = None
    experience_level: Optional[str] = "Beginner"
    preferred_topics: Optional[str] = None
    presentation_domains: Optional[str] = None
    learning_goals: Optional[str] = None
    coaching_preferences: Optional[str] = None
    bio: Optional[str] = None
    communication_level: Optional[int] = 70
    debate_level: Optional[int] = 65
    critical_thinking_level: Optional[int] = 72
    presentation_level: Optional[int] = 68
    confidence_level: Optional[int] = 75

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    profile: Optional[UserProfileSchema] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_topics: Optional[str] = None
    presentation_domains: Optional[str] = None
    learning_goals: Optional[str] = None
    coaching_preferences: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
