from typing import Optional, List
from pydantic import BaseModel
from app.services.argument_engine import ArgumentComponent
from app.services.fallacy_engine import DetectedFallacyItem
from app.services.scoring_engine import PerformanceScoreBreakdown, DebateReportOutput

class TextAnalysisRequest(BaseModel):
    text: str
    motion_context: Optional[str] = None
    session_id: Optional[str] = None

class ArgumentAnalysisResponse(BaseModel):
    arguments: List[ArgumentComponent]
    total_arguments: int

class FallacyDetectionResponse(BaseModel):
    fallacies: List[DetectedFallacyItem]
    total_fallacies: int
    credibility_penalty_total: int

class SessionEvaluationRequest(BaseModel):
    transcript_text: str
    motion_context: Optional[str] = None
