from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import UserRole, ExperienceLevel

# Shared Properties
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[UserRole] = UserRole.LEARNER

# User Registration Request
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

# User Update Request
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

# Admin User Role Change
class UserRoleUpdate(BaseModel):
    role: UserRole

# Login Request
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Google OAuth Request
class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # in seconds

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None

# User Response
class UserResponse(UserBase):
    id: str
    is_active: bool
    oauth_provider: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# User with Profile Response
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

class UserWithProfileResponse(UserResponse):
    profile: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True
