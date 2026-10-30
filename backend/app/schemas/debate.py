from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.debate import DebateFormat, DebatePosition, DebateStatus

class DebateCreate(BaseModel):
    title: str
    topic: str
    format: DebateFormat = DebateFormat.AI_SIMULATION
    difficulty: str = "Intermediate"
    duration_minutes: int = 15
    user_position: DebatePosition = DebatePosition.FOR
    max_rounds: int = 4

class DebateMessageCreate(BaseModel):
    content: str

class DebateMessageOut(BaseModel):
    id: int
    debate_id: int
    round_number: int
    sender_type: str
    sender_name: str
    content: str
    timestamp: datetime
    instant_critique: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DebateEvaluationOut(BaseModel):
    id: int
    debate_id: int
    argument_quality: float
    evidence_usage: float
    logical_consistency: float
    rebuttal_effectiveness: float
    communication_skills: float
    total_score: float
    winner: str
    summary: Optional[str]
    strengths: List[str] = []
    weaknesses: List[str] = []
    actionable_feedback: List[str] = []
    rubric_breakdown: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class DebateSessionOut(BaseModel):
    id: int
    creator_id: int
    title: str
    topic: str
    format: DebateFormat
    difficulty: str
    duration_minutes: int
    user_position: DebatePosition
    ai_position: DebatePosition
    status: DebateStatus
    winner: str
    current_round: int
    max_rounds: int
    created_at: datetime
    ended_at: Optional[datetime] = None
    messages: List[DebateMessageOut] = []
    evaluation: Optional[DebateEvaluationOut] = None

    class Config:
        from_attributes = True
