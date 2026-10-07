from typing import Literal
from pydantic import BaseModel, Field


class FallacyItem(BaseModel):
    fallacy_type: str
    quote: str
    explanation: str
    correction_suggestion: str
    severity: Literal["low", "medium", "high"] = "medium"
    credibility_impact: str


class ExtractedArgument(BaseModel):
    central_claim: str
    claim_type: Literal["policy", "factual", "value", "causal"] = "value"
    premises: list[str] = []
    evidence_points: list[str] = []
    evidence_strength_rating: Literal["weak", "moderate", "strong"] = "moderate"
    conclusions: list[str] = []


class EvaluationCriteria(BaseModel):
    clarity: float = Field(..., ge=0, le=100)
    relevance: float = Field(..., ge=0, le=100)
    evidence_strength: float = Field(..., ge=0, le=100)
    logical_consistency: float = Field(..., ge=0, le=100)
    persuasiveness: float = Field(..., ge=0, le=100)


class WeightedScoreBreakdown(BaseModel):
    argument_quality: float = Field(..., description="Weight 30%")
    evidence_usage: float = Field(..., description="Weight 20%")
    logical_consistency: float = Field(..., description="Weight 20%")
    rebuttal_effectiveness: float = Field(..., description="Weight 15%")
    communication_skills: float = Field(..., description="Weight 15%")
    overall_score: float = Field(..., description="Weighted total out of 100")


class AnalysisRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Debate speech transcript or argument text")
    topic: str | None = Field(None, description="Debate topic or motion")
    position: str | None = Field(None, description="Position (e.g. Proposition, Opposition)")
    context: str | None = Field(None, description="Additional context or debate format")


class AnalysisReportResponse(BaseModel):
    topic: str | None = None
    position: str | None = None
    word_count: int
    char_count: int
    overall_score: float
    grade: str
    weighted_scores: WeightedScoreBreakdown
    evaluation_criteria: EvaluationCriteria
    fallacies: list[FallacyItem]
    arguments: ExtractedArgument
    executive_summary: str
    key_strengths: list[str]
    areas_for_improvement: list[str]
    actionable_recommendations: list[str]


class FallacyDefinition(BaseModel):
    name: str
    category: str
    description: str
    example: str
    correction: str
