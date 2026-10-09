from datetime import datetime

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    transcript: str = Field(min_length=20, max_length=100_000)


class ArgumentAnalysis(BaseModel):
    text: str
    claim: str
    evidence: list[str]
    reasoning: str | None
    quality: float = Field(ge=0, le=100)


class FallacyFinding(BaseModel):
    type: str
    text: str
    explanation: str
    severity: str


class AnalysisScores(BaseModel):
    claim_quality: float = Field(ge=0, le=100)
    evidence_quality: float = Field(ge=0, le=100)
    reasoning_quality: float = Field(ge=0, le=100)
    fallacy_control: float = Field(ge=0, le=100)
    overall: float = Field(ge=0, le=100)


class AnalysisReport(BaseModel):
    id: str
    debate_id: str
    generated_by: str
    created_at: datetime
    updated_at: datetime
    arguments: list[ArgumentAnalysis]
    fallacies: list[FallacyFinding]
    counterarguments: list[str]
    scores: AnalysisScores
    feedback: list[str]

