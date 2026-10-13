import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.user import UserRole, AuthProvider


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.learner


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_provider: AuthProvider
    is_active: bool
    created_at: datetime


class UserReadPublic(BaseModel):
    """Reduced view — safe to share across roles."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    role: UserRole
