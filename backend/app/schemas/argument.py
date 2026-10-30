from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

# Argument Analysis
class ArgumentAnalysisRequest(BaseModel):
    argument: str
    topic: Optional[str] = None

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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Logical Fallacy Detection
class FallacyDetectionRequest(BaseModel):
    text: str

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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Counterargument Generation
class CounterargumentRequest(BaseModel):
    argument: str
    topic: Optional[str] = None

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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
