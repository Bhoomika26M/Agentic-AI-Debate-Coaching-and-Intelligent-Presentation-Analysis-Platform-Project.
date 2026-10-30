from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel

class PresentationAnalysisOut(BaseModel):
    id: int
    title: str
    audio_filename: Optional[str] = None
    duration_seconds: float
    transcription: str
    words_per_minute: float
    speech_pace_label: str
    total_words: int
    filler_words_count: int
    filler_words_breakdown: Dict[str, int] = {}
    repeated_words: List[str] = []
    pauses_detected: int
    confidence_score: float
    clarity_score: float
    audience_engagement_score: float
    overall_presentation_score: float
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_recommendations: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True
