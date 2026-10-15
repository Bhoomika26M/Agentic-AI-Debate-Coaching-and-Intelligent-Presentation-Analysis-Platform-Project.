from pydantic import BaseModel, Field
from typing import List, Optional

class ArgumentAnalysisRequest(BaseModel):
    argument_text: str = Field(min_length=20)
    topic: Optional[str] = None
    session_id: Optional[str] = None

class ArgumentAnalysisOut(BaseModel):
    id: str
    main_claim: str
    supporting_reasons: List[str]
    evidence_used: List[str]
    missing_evidence: List[str]
    clarity_score: float
    relevance_score: float
    logical_consistency_score: float
    persuasiveness_score: float
    strengths: List[str]
    weaknesses: List[str]
    improvement_suggestions: List[str]
    overall_score: float

class FallacyRequest(BaseModel):
    argument_text: str = Field(min_length=20)

class FallacyOut(BaseModel):
    id: str
    fallacies: List[dict]  # {name, excerpt, explanation, correction, confidence}
    note: str

class CounterArgumentRequest(BaseModel):
    claim: str = Field(min_length=10)
    topic: Optional[str] = None

class CounterArgumentOut(BaseModel):
    id: str
    counterarguments: List[dict]  # {type, text, reasoning, evidence_needed}
    challenge_questions: List[str]
    strategy_suggestions: List[str]

class PresentationTextRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    transcript: str = Field(min_length=30)
    duration_seconds: Optional[float] = None

class PresentationAudioResponse(BaseModel):
    session_id: str
    transcript: str
    message: str

class PresentationAnalysisOut(BaseModel):
    id: str
    session_id: str
    word_count: int
    duration_seconds: Optional[float]
    words_per_minute: Optional[float]
    filler_word_count: int
    clarity_score: float
    organization_score: float
    engagement_score: float
    strengths: List[str]
    weaknesses: List[str]
    improvement_suggestions: List[str]
    opening_suggestion: str
    conclusion_suggestion: str