from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.timezone import UTCDateTime


class ArgumentAnalysisScore(BaseModel):
    criterion: str
    score: int = Field(ge=0, le=100)
    explanation: str = Field(min_length=1, max_length=600)


class Claim(BaseModel):
    claim_type: str = Field(min_length=1, max_length=50)
    text: str = Field(min_length=1, max_length=2000)
    position: str | None = Field(default=None, pattern="^(for|against|neutral)$")


class EvidenceItem(BaseModel):
    evidence_text: str = Field(min_length=1, max_length=4000)
    supports_claim: str = Field(min_length=1, max_length=2000)
    relevance: int = Field(ge=0, le=100)
    strength: int = Field(ge=0, le=100)
    explicitly_present: bool = True
    notes: str | None = Field(default=None, max_length=600)


class DetectedFallacy(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    excerpt: str = Field(min_length=1, max_length=4000)
    explanation: str = Field(min_length=1, max_length=1200)
    confidence: int = Field(ge=0, le=100)
    suggestion: str | None = Field(default=None, max_length=1000)


class ReasoningAssessment(BaseModel):
    relationship: str = Field(min_length=1, max_length=1200)
    logical_consistency: str = Field(min_length=1, max_length=1200)
    gaps: list[str] = Field(default_factory=list)
    unsupported_assumptions: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class ArgumentAnalysisInput(BaseModel):
    topic: str = Field(min_length=3, max_length=255)
    argument_text: str = Field(min_length=20, max_length=20000)
    position: str | None = Field(default=None, pattern="^(for|against|neutral)$")
    debate_session_id: int | None = None

    @field_validator("topic", "argument_text")
    @classmethod
    def strip_and_validate(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty")
        return cleaned


class ArgumentAnalysisResult(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    scores: list[ArgumentAnalysisScore] = Field(default_factory=list)
    claims: list[Claim] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    reasoning: ReasoningAssessment
    fallacies: list[DetectedFallacy] = Field(default_factory=list)
    feedback_report: str | None = Field(default=None, max_length=4000)
    improvement_suggestions: list[str] = Field(default_factory=list)


class ArgumentAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    debate_session_id: int | None = None
    topic: str
    argument_text: str
    position: str | None
    status: str
    overall_score: float | None = None
    claims: list[Claim] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    reasoning_assessment: ReasoningAssessment | None = None
    detected_fallacies: list[DetectedFallacy] = Field(default_factory=list)
    scores: list[ArgumentAnalysisScore] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)
    feedback_report: str | None = None
    created_at: UTCDateTime
    updated_at: UTCDateTime
