from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.core.timezone import UTCDateTime


class UserUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class UserRoleUpdate(BaseModel):
    role: str = Field(pattern="^(learner|debate_coach|educator|administrator)$")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
