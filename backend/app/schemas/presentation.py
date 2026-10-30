from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class PresentationEvaluation(BaseModel):
    overall_score: float | None = Field(default=None, ge=0, le=100)
    confidence_score: float | None = Field(default=None, ge=0, le=100)
    clarity_score: float | None = Field(default=None, ge=0, le=100)
    engagement_score: float | None = Field(default=None, ge=0, le=100)
    strengths: list[str] = Field(default_factory=list, max_length=20)
    improvement_areas: list[str] = Field(default_factory=list, max_length=20)
    recommendations: list[str] = Field(default_factory=list, max_length=20)
    delivery_observations: list[str] = Field(default_factory=list, max_length=20)
    limitations: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def require_observations(self):
        if not (self.strengths or self.improvement_areas or self.recommendations or self.delivery_observations):
            raise ValueError("The presentation analysis contains no useful feedback.")
        return self


class PresentationAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_filename: str
    submission_type: Literal["audio", "transcript"]
    mime_type: str
    file_size_bytes: int
    status: Literal["pending", "processing", "completed", "failed"]
    error_message: str | None
    transcript: str | None
    duration_seconds: float | None
    word_count: int | None
    filler_word_count: int | None
    speaking_rate_wpm: float | None
    analysis_result: dict | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    def confidence_score(self) -> float | None:
        if isinstance(self.analysis_result, dict):
            val = self.analysis_result.get("confidence_score")
            return float(val) if isinstance(val, (int, float)) else None
        return None

    @computed_field
    def clarity_score(self) -> float | None:
        if isinstance(self.analysis_result, dict):
            val = self.analysis_result.get("clarity_score")
            return float(val) if isinstance(val, (int, float)) else None
        return None

    @computed_field
    def engagement_score(self) -> float | None:
        if isinstance(self.analysis_result, dict):
            val = self.analysis_result.get("engagement_score")
            return float(val) if isinstance(val, (int, float)) else None
        return None


class PresentationDashboardResponse(BaseModel):
    total_submissions: int
    completed_submissions: int
    average_score: float | None
    recent_submissions: list[PresentationAnalysisResponse]
