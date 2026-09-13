from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DebateCreate(BaseModel):
    topic: str = Field(min_length=2, max_length=255)
    description: str | None = None
    format: str = Field(pattern="^(one_on_one|parliamentary|oxford|policy|public_forum|ai_simulation)$")
    scheduled_at: datetime | None = None


class DebateUpdate(BaseModel):
    topic: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    format: str | None = Field(default=None, pattern="^(one_on_one|parliamentary|oxford|policy|public_forum|ai_simulation)$")
    scheduled_at: datetime | None = None
    status: str | None = Field(default=None, pattern="^(scheduled|active|completed|cancelled)$")


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    user_id: int
    position: str
    joined_at: datetime


class DebateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic: str
    description: str | None
    format: str
    scheduled_at: datetime | None
    created_by: int
    status: str
    created_at: datetime
    participants: list[ParticipantResponse] = []
