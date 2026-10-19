from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_topics: Optional[List[str]] = None
    presentation_domains: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    coaching_preferences: Optional[dict] = None

class AdminCreateUser(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern="^(learner|debate_coach|educator|admin)$")