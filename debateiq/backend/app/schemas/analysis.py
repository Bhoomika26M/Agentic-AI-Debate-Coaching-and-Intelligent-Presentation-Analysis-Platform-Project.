from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ArgumentScoreBreakdown(BaseModel):
    clarity: float = Field(..., ge=0.0, le=100.0)
    relevance: float = Field(..., ge=0.0, le=100.0)
    evidence_strength: float = Field(..., ge=0.0, le=100.0)
    logical_consistency: float = Field(..., ge=0.0, le=100.0)
    persuasiveness: float = Field(..., ge=0.0, le=100.0)
    overall: float = Field(..., ge=0.0, le=100.0)

class PremiseItem(BaseModel):
    text: str
    premise_type: str  # Causal, Normative, Factual, Inductive
    relevance_score: float

class EvidenceItem(BaseModel):
    excerpt: str
    category: str  # Statistical, Empirical, Expert Consensus, Historical, Anecdotal
    credibility_rating: float
    verified: bool

class ArgumentAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=5)
    context: Optional[str] = "Debate Speech"

class ArgumentAnalysisResponse(BaseModel):
    claim: str
    premises: List[PremiseItem]
    evidence: List[EvidenceItem]
    scores: ArgumentScoreBreakdown
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]

class FallacyFindingItem(BaseModel):
    fallacy_type: str
    excerpt_text: str
    span_start: int
    span_end: int
    confidence: float
    severity: str  # High, Medium, Low
    explanation: str
    corrected_rewrite: str
    credibility_impact: float

class FallacyDetectionRequest(BaseModel):
    text: str = Field(..., min_length=5)
    context: Optional[str] = "Debate Speech"

class FallacyDetectionResponse(BaseModel):
    fallacies_detected: List[FallacyFindingItem]
    total_count: int
    credibility_penalty_total: float
    overall_credibility_score: float
    reasoning_summary: str

class FallacyCatalogItem(BaseModel):
    name: str
    category: str
    description: str
    classic_example: str
    remediation_strategy: str
    counter_tactic: str

class RebuttalItem(BaseModel):
    perspective: str  # Logical, Evidence-Based, Ethical, Practical, Policy
    counter_thesis: str
    premises: List[str]
    suggested_evidence: str
    challenge_question: str

class RebuttalGenerationRequest(BaseModel):
    target_claim: str = Field(..., min_length=5)
    motion_context: Optional[str] = None
    target_position: Optional[str] = "opposition"

class RebuttalMatrixResponse(BaseModel):
    target_claim: str
    rebuttals: List[RebuttalItem]
    recommended_strategy: str
    weakness_exploited: str

class FeedbackReportResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    executive_summary: str
    overall_performance_score: float
    credibility_index: float
    key_strengths: List[str]
    critical_vulnerabilities: List[str]
    coaching_drills_prescribed: List[str]
    created_at: datetime

    class Config:
        from_attributes = True
