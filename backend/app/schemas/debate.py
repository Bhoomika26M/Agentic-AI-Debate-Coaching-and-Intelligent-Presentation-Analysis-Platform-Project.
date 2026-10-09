from datetime import datetime
from pydantic import BaseModel, Field
from app.models.debate import DebateFormat, DebatePosition, DebateStatus
from app.schemas.user import UserPublic

class DebateCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=255)
    description: str | None = None
    format: DebateFormat
    scheduled_at: datetime

class DebateUpdate(BaseModel):
    topic: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    format: DebateFormat | None = None
    scheduled_at: datetime | None = None
    status: DebateStatus | None = None

class ParticipantCreate(BaseModel):
    position: DebatePosition = DebatePosition.NEUTRAL

class ParticipantRead(BaseModel):
    id: str
    debate_id: str
    user_id: str
    position: DebatePosition
    joined_at: datetime
    user: UserPublic

class DebateRead(BaseModel):
    id: str
    topic: str
    description: str | None
    format: DebateFormat
    scheduled_at: datetime
    created_by: str
    status: DebateStatus
    created_at: datetime
    updated_at: datetime
    creator: UserPublic
    participants: list[ParticipantRead] = []
