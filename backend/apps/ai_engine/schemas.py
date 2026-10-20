from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class ToulminModel(BaseModel):
    claim: str = Field(description="The primary assertion or conclusion of the argument")
    grounds: str = Field(description="The evidence, empirical data, or premises cited in support")
    warrant: str = Field(description="The underlying reasoning principle that connects grounds to claim")
    backing: str = Field(default="", description="Theoretical, empirical, or institutional justification that establishes why the warrant is valid")
    qualifier: str = Field(default="Universal", description="Scope or degree of certainty (e.g. definitely, in most cases, conditionally)")
    rebuttal: str = Field(default="", description="Anticipated counter-conditions, edge cases, or reservations where the claim would not hold")

class FallacyItem(BaseModel):
    type: str = Field(description="Formal or informal fallacy name (e.g., Slippery Slope, Straw Man, Ad Hominem, False Dilemma)")
    excerpt: str = Field(description="Direct snippet from user text containing the fallacy")
    explanation: str = Field(description="Detailed explanation of why this reasoning is logically invalid")
    correction: str = Field(description="How to rephrase or substantiate the argument without the fallacy")

class CounterArgumentItem(BaseModel):
    perspective: str = Field(description="Category or philosophical framework of the rebuttal (e.g., Empirical, Ethical, Deontological)")
    claim: str = Field(description="The counter-assertion")
    counter_evidence: Optional[str] = Field(default="", description="Supporting factual or logical basis")

class ArgumentScoreRubric(BaseModel):
    logic: int = Field(ge=0, le=100, description="Deductive/inductive validity score")
    evidence: int = Field(ge=0, le=100, description="Empirical and factual substantiation score")
    persuasiveness: int = Field(ge=0, le=100, description="Rhetorical and persuasive efficacy")
    clarity: int = Field(ge=0, le=100, description="Structural and linguistic clarity score")
    overall: int = Field(ge=0, le=100, description="Composite normalized score")

class ArgumentAnalysisResult(BaseModel):
    toulmin: ToulminModel
    scores: ArgumentScoreRubric
    fallacies: List[FallacyItem] = Field(default_factory=list)
    counterarguments: List[CounterArgumentItem] = Field(default_factory=list)
    feedback: str = Field(description="Actionable qualitative coach guidance")

class DebateTurnResponse(BaseModel):
    analysis: ArgumentAnalysisResult
    ai_rebuttal: str = Field(description="The simulated opponent's verbal speech turn")
    persona_notes: Optional[str] = Field(default="", description="Strategic coaching notes regarding opponent angle")

class SpeechCritiqueResult(BaseModel):
    wpm: int
    total_words: int
    duration_seconds: float
    filler_count: int
    filler_breakdown: Dict[str, int]
    scores: Dict[str, int]
    feedback: str

class SlideCritiqueItem(BaseModel):
    slide_number: int
    headline: str
    word_count: int
    density_rating: str  # 'OPTIMAL', 'TOO_DENSE', 'TOO_SPARSE'
    visual_structure_score: int
    clarity_score: int
    critique: str
    recommendation: str

class PresentationCritiqueResult(BaseModel):
    title: str
    total_slides: int
    overall_score: int
    summary: str
    slides: List[SlideCritiqueItem]

class RebuttalEvaluationResult(BaseModel):
    rebuttal_score: int = Field(ge=0, le=100, description="Overall efficacy score of the user's rebuttal (0-100)")
    is_effective: bool = Field(description="True if the rebuttal successfully dismantled or mitigated the fallacy/claim")
    strengths: List[str] = Field(default_factory=list, description="Specific logical strengths of the user's rebuttal")
    flaws: List[str] = Field(default_factory=list, description="Weaknesses, missing warrants, or lingering fallacies in the rebuttal")
    improved_version: str = Field(description="An exemplar collegiate-level phrasing of the rebuttal")
    coach_tip: str = Field(description="Actionable strategic debate advice for future rounds")
