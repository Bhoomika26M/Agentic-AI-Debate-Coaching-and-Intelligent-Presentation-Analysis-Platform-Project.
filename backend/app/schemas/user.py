from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class RoleEnum(str, Enum):
    learner = "learner"
    coach = "coach"
    educator = "educator"
    admin = "admin"

class ProfileBase(BaseModel):
    experience_level: str = "beginner"
    preferred_topics: Optional[str] = None
    learning_goals: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class Profile(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.learner

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
