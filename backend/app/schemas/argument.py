from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Argument Analysis
class ArgumentAnalysisRequest(BaseModel):
    argument: str = Field(..., min_length=5, max_length=5000)
    topic: Optional[str] = Field(None, max_length=200)

class ArgumentAnalysisOut(BaseModel):
    id: Optional[int] = None
    input_argument: str
    topic: Optional[str] = None
    main_claim: str
    supporting_arguments: List[str]
    evidence_assessment: str
    strengths: List[str]
    weaknesses: List[str]
    missing_evidence: str
    suggestions: List[str]
    clarity_score: float
    relevance_score: float
    evidence_strength_score: float
    logical_consistency_score: float
    persuasiveness_score: float
    overall_score: float
    inference_mode: Optional[str] = "development_heuristic_mode"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Logical Fallacy Detection
class FallacyDetectionRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=5000)

class DetectedFallacyItem(BaseModel):
    name: str
    sentence: str
    explanation: str
    problematic_reasoning: str
    corrected_version: str
    improvement_tips: str

class FallacyDetectionOut(BaseModel):
    id: Optional[int] = None
    input_text: str
    has_fallacies: bool
    fallacies: List[DetectedFallacyItem]
    credibility_impact: str
    summary: str
    inference_mode: Optional[str] = "development_heuristic_mode"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Counterargument Generation
class CounterargumentRequest(BaseModel):
    argument: str = Field(..., min_length=5, max_length=5000)
    topic: Optional[str] = Field(None, max_length=200)

class CounterargumentOut(BaseModel):
    id: Optional[int] = None
    input_argument: str
    topic: Optional[str] = None
    logical_rebuttals: List[str]
    evidence_based_rebuttals: List[str]
    ethical_counterarguments: List[str]
    practical_counterarguments: List[str]
    policy_counterarguments: List[str]
    alternative_perspectives: List[str]
    challenge_questions: List[str]
    debate_strategy_suggestions: List[str]
    inference_mode: Optional[str] = "development_heuristic_mode"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
