from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class DebateTopicBase(BaseModel):
    title: str
    motion_text: str
    category: str
    difficulty_level: str = "Intermediate"
    proposition_stance: Optional[str] = None
    opposition_stance: Optional[str] = None

class DebateTopicCreate(DebateTopicBase):
    pass

class DebateTopicRead(DebateTopicBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParticipantRead(BaseModel):
    id: str
    session_id: str
    user_id: str
    position: str
    speaking_order: int
    score_awarded: Optional[float] = None
    joined_at: datetime
    user_name: Optional[str] = None
    user_role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ParticipantJoinRequest(BaseModel):
    position: str = "proposition"  # proposition, opposition, adjudicator, observer
    speaking_order: int = 1


class DebateSessionBase(BaseModel):
    topic_id: str
    debate_format: str
    session_title: str
    scheduled_start: datetime

class DebateSessionCreate(DebateSessionBase):
    initial_position: Optional[str] = "proposition"

class DebateSessionUpdate(BaseModel):
    session_title: Optional[str] = None
    status: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None

class DebateSessionRead(BaseModel):
    id: str
    topic_id: str
    debate_format: str
    session_title: str
    status: str
    scheduled_start: datetime
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    topic: Optional[DebateTopicRead] = None
    participants: List[ParticipantRead] = []

    model_config = ConfigDict(from_attributes=True)
