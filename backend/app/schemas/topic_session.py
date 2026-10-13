from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import TopicDifficulty, DebateFormat, SessionStatus, ParticipantPosition, RecordingType
from app.schemas.user import UserResponse

# ==================== TOPIC SCHEMAS ====================
class TopicBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: str = Field(..., min_length=2, max_length=100)
    difficulty: TopicDifficulty = TopicDifficulty.INTERMEDIATE

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    difficulty: Optional[TopicDifficulty] = None

class TopicResponse(TopicBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PARTICIPANT SCHEMAS ====================
class ParticipantAssign(BaseModel):
    user_id: str
    position: ParticipantPosition = ParticipantPosition.PROPOSITION
    speaker_order: int = Field(1, ge=1)

class ParticipantResponse(BaseModel):
    session_id: str
    user_id: str
    position: ParticipantPosition
    speaker_order: int
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ==================== RECORDING SCHEMAS ====================
class RecordingResponse(BaseModel):
    id: str
    session_id: str
    file_url: str
    type: RecordingType
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== SESSION SCHEMAS ====================
class SessionCreate(BaseModel):
    topic_id: str
    format: DebateFormat = DebateFormat.ONE_ON_ONE
    scheduled_at: datetime
    duration_min: int = Field(45, ge=10, le=180)
    coach_id: Optional[str] = None
    participants: Optional[List[ParticipantAssign]] = []

class SessionUpdate(BaseModel):
    format: Optional[DebateFormat] = None
    status: Optional[SessionStatus] = None
    scheduled_at: Optional[datetime] = None
    duration_min: Optional[int] = Field(None, ge=10, le=180)
    coach_id: Optional[str] = None

class SessionStatusUpdate(BaseModel):
    status: SessionStatus

class SessionResponse(BaseModel):
    id: str
    topic_id: str
    format: DebateFormat
    status: SessionStatus
    scheduled_at: datetime
    duration_min: int
    created_by: str
    coach_id: Optional[str] = None
    created_at: datetime
    topic: Optional[TopicResponse] = None
    participants: List[ParticipantResponse] = []
    recordings: List[RecordingResponse] = []

    class Config:
        from_attributes = True