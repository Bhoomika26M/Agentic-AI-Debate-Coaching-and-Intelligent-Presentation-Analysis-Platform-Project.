from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ScoringWeights(BaseModel):
    argument_quality: float = 0.30
    evidence_usage: float = 0.20
    logical_consistency: float = 0.20
    rebuttal_effectiveness: float = 0.15
    communication_skills: float = 0.15

class ScoreBreakdown(BaseModel):
    argument_quality: float = Field(..., ge=0.0, le=100.0)
    evidence_usage: float = Field(..., ge=0.0, le=100.0)
    logical_consistency: float = Field(..., ge=0.0, le=100.0)
    rebuttal_effectiveness: float = Field(..., ge=0.0, le=100.0)
    communication_skills: float = Field(..., ge=0.0, le=100.0)
    overall_performance_score: float = Field(..., ge=0.0, le=100.0)

class ScoringRequest(BaseModel):
    session_id: Optional[str] = None
    argument_quality: Optional[float] = None
    evidence_usage: Optional[float] = None
    logical_consistency: Optional[float] = None
    rebuttal_effectiveness: Optional[float] = None
    communication_skills: Optional[float] = None
    raw_speech_text: Optional[str] = None
    motion_context: Optional[str] = None

class ScoringResponse(BaseModel):
    weights_applied: ScoringWeights
    scores: ScoreBreakdown
    critical_thinking_index: float
    communication_effectiveness: float
    xp_awarded: int
    streak_bonus: bool
    formula_audit: str

class SessionScoreRecordResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    overall_score: float
    argument_quality_score: float
    evidence_score: float
    logical_consistency_score: float
    rebuttal_score: float
    communication_score: float
    critical_thinking_score: float
    created_at: datetime

    class Config:
        from_attributes = True
