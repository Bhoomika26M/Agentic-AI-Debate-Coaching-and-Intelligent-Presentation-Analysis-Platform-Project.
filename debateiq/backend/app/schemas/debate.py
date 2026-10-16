from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TopicCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    motion_text: str = Field(..., min_length=10)
    category: str = "AI & Technology"
    difficulty: str = "Intermediate"
    proposition_summary: Optional[str] = None
    opposition_summary: Optional[str] = None

class TopicAISuggestRequest(BaseModel):
    category: Optional[str] = "All"
    difficulty: Optional[str] = "Intermediate"
    count: int = Field(default=3, ge=1, le=10)

class TopicResponse(BaseModel):
    id: str
    title: str
    motion_text: str
    category: str
    difficulty: str
    proposition_summary: Optional[str]
    opposition_summary: Optional[str]
    is_curated: bool
    created_at: datetime

    class Config:
        from_attributes = True

class FormatInfoResponse(BaseModel):
    name: str
    description: str
    speaker_order: List[Dict[str, Any]]
    turn_duration_seconds: int
    total_rounds: int
    prep_time_seconds: int
    rules_summary: List[str]

class SessionCreate(BaseModel):
    topic_id: str
    format: str = "AI Debate Simulation"
    scheduled_at: Optional[datetime] = None
    user_position: str = "proposition"  # proposition, opposition, or random
    ai_opponent_difficulty: Optional[str] = "Intermediate"
    ai_persona: Optional[str] = "Socratic Questioner"

class SessionUpdate(BaseModel):
    status: Optional[str] = None
    current_round: Optional[int] = None
    active_speaker_position: Optional[str] = None

class ParticipantResponse(BaseModel):
    id: str
    session_id: str
    user_id: Optional[str]
    is_ai: bool
    ai_persona: Optional[str]
    position: str
    speaker_order_index: int
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class TurnCreate(BaseModel):
    speech_text: str = Field(..., min_length=3)
    round_number: Optional[int] = 1
    duration_seconds: Optional[int] = 60
    audio_transcript_confidence: Optional[float] = None

class TurnResponse(BaseModel):
    id: str
    session_id: str
    speaker_id: Optional[str]
    speaker_position: str
    round_number: int
    turn_type: str
    speech_text: str
    wpm: Optional[float]
    filler_word_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    id: str
    topic_id: str
    topic_title: Optional[str] = None
    motion_text: Optional[str] = None
    format: str
    status: str
    current_round: int
    turn_timer_seconds: int
    active_speaker_position: Optional[str]
    ai_opponent_difficulty: Optional[str]
    ai_persona: Optional[str]
    created_by: Optional[str]
    created_at: datetime
    scheduled_at: Optional[datetime]
    completed_at: Optional[datetime]
    participants: List[ParticipantResponse] = Field(default_factory=list)
    turns: List[TurnResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
