from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class PresentationAnalyzeRequest(BaseModel):
    title: str = "Keynote Practice"
    transcript_text: Optional[str] = None
    media_type: str = "audio" # audio, video, mic_recording
    duration_seconds: Optional[float] = 120.0

class PresentationMetricResponse(BaseModel):
    words_per_minute: float
    pace_classification: str
    filler_words_count: int
    filler_words_breakdown: Dict[str, int]
    confidence_score: float
    clarity_score: float
    engagement_score: float
    speaking_score: float
    overall_score: float
    pace_timeline: List[Dict[str, Any]]
    confidence_explanation: str
    strengths: str
    weaknesses: str
    recommended_improvements: str

    class Config:
        from_attributes = True

class PresentationSessionResponse(BaseModel):
    id: int
    title: str
    media_type: str
    duration_seconds: float
    status: str
    transcript: Optional[str] = None
    metrics: Optional[PresentationMetricResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True
