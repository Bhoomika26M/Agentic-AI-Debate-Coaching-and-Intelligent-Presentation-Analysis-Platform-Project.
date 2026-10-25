from typing import Optional, List
from pydantic import BaseModel, Field
from app.services.presentation_engine import PresentationMetrics, FillerWordDetail
from app.services.report_engine import FullDebateForensicsReport

class PresentationAnalysisRequest(BaseModel):
    speech_text: str = Field(..., min_length=5)
    speech_duration_sec: Optional[float] = None

class FullReportRequest(BaseModel):
    motion: str
    transcript_text: str
    speech_duration_sec: Optional[float] = None
