from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DebateCreate(BaseModel):
    topic: str
    position: str = "For"
    format: str = "One-on-One Debate"
    difficulty: str = "Intermediate"
    duration_minutes: int = 10
    ai_opponent_personality: str = "Analytical"
    rounds_count: int = 3

class DebateRoundSubmit(BaseModel):
    argument_text: str

class ClaimItem(BaseModel):
    text: str
    claim_type: str = "Main Claim"

class EvidenceItem(BaseModel):
    text: str
    evidence_type: str = "Empirical"
    relevance_score: float = 80.0
    strength_score: float = 75.0
    quality_score: float = 75.0
    sufficiency_score: float = 70.0

class FallacyItem(BaseModel):
    fallacy_name: str
    confidence: float
    problematic_statement: str
    explanation: str
    why_problematic: str
    correct_reasoning: str
    suggested_correction: str
    improved_argument: str

class CounterargumentItem(BaseModel):
    logical_rebuttal: str
    evidence_rebuttal: str
    ethical_rebuttal: str
    practical_rebuttal: str
    policy_rebuttal: str
    challenge_questions: List[str] = []
    strategy_suggestions: str
    explanation: str

class ArgumentAnalysisResponse(BaseModel):
    claims: List[ClaimItem] = []
    evidence: List[EvidenceItem] = []
    fallacies: List[FallacyItem] = []
    counterarguments: Optional[CounterargumentItem] = None
    argument_strength_score: float
    reasoning_quality_score: float
    clarity_score: float
    relevance_score: float
    evidence_score: float
    consistency_score: float
    persuasiveness_score: float
    improved_version: str
    coaching_feedback: Dict[str, Any] = {}

class DebateScoreResponse(BaseModel):
    argument_quality: float         # 30%
    evidence_usage: float           # 20%
    logical_consistency: float      # 20%
    rebuttal_effectiveness: float   # 15%
    communication_skills: float     # 15%
    overall_score: float            # 100% total
    strongest_argument: Optional[str] = None
    weakest_argument: Optional[str] = None
    best_rebuttal: Optional[str] = None
    detected_fallacies_count: int = 0
    missing_evidence: Optional[str] = None
    suggested_improvement: Optional[str] = None
    coaching_summary: Optional[str] = None
    next_practice_exercise: Optional[str] = None

class DebateRoundResponse(BaseModel):
    id: int
    round_number: int
    user_transcript: Optional[str] = None
    ai_transcript: Optional[str] = None
    analysis: Optional[ArgumentAnalysisResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DebateSessionResponse(BaseModel):
    id: int
    topic: str
    position: str
    format: str
    difficulty: str
    duration_minutes: int
    ai_opponent_personality: str
    rounds_count: int
    current_round: int
    status: str
    rounds: List[DebateRoundResponse] = []
    score: Optional[DebateScoreResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True
