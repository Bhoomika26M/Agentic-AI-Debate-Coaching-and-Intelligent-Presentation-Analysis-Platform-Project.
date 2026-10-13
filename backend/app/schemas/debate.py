import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.debate import DebateFormat, SessionStatus, ParticipantPosition


# ─── Debate Topic ─────────────────────────────────────────────────────────────

class TopicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class TopicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    created_by: Optional[uuid.UUID]
    created_at: datetime


# ─── Debate Session ───────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    topic_id: uuid.UUID
    format: DebateFormat
    scheduled_at: Optional[datetime] = None
    position: ParticipantPosition = ParticipantPosition.observer  # creator's initial position


class SessionUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    format: Optional[DebateFormat] = None
    recording_url: Optional[str] = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic_id: Optional[uuid.UUID]
    format: DebateFormat
    status: SessionStatus
    scheduled_at: Optional[datetime]
    created_by: Optional[uuid.UUID]
    recording_url: Optional[str]
    created_at: datetime
    updated_at: datetime


# ─── Participant ──────────────────────────────────────────────────────────────

class JoinSessionRequest(BaseModel):
    position: ParticipantPosition


class ParticipantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    user_id: uuid.UUID
    position: ParticipantPosition
    joined_at: datetime


# ─── Presentation History ─────────────────────────────────────────────────────

class PresentationCreate(BaseModel):
    title: str
    domain: Optional[str] = None


class PresentationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    domain: Optional[str]
    created_at: datetime
