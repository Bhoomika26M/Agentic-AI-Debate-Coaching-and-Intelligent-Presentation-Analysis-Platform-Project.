from typing import Literal

from pydantic import BaseModel, Field, model_validator


class DebateTurn(BaseModel):
    speaker: Literal["learner", "opponent"]
    content: str = Field(min_length=1, max_length=4000)


class DebateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=240)
    learner_position: Literal["for", "against"]
    persona: Literal["strategist", "skeptic", "diplomat"]
    difficulty: Literal["warm-up", "challenge", "cross-examination"]
    history: list[DebateTurn] = Field(default_factory=list, max_length=20)
    learner_argument: str | None = Field(default=None, max_length=4000)


class AnalysisTurn(BaseModel):
    speaker: Literal["learner", "opponent"]
    content: str = Field(min_length=1, max_length=4000)


class AnalysisRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=240)
    learner_position: Literal["for", "against"]
    turns: list[AnalysisTurn] = Field(min_length=1, max_length=40)
    persona: Literal["strategist", "skeptic", "diplomat"] | None = None
    difficulty: Literal["warm-up", "challenge", "cross-examination"] | None = None

    @model_validator(mode="after")
    def requires_learner_turn(self):
        if not any(turn.speaker == "learner" for turn in self.turns):
            raise ValueError("Add at least one learner argument before requesting analysis.")
        return self


class RubricRating(BaseModel):
    score: int = Field(ge=1, le=5)
    note: str = Field(min_length=1, max_length=240)


class RubricRatings(BaseModel):
    clarity: RubricRating
    relevance: RubricRating
    evidence_strength: RubricRating
    logical_consistency: RubricRating
    persuasiveness: RubricRating


class FallacyFlag(BaseModel):
    label: Literal[
        "Ad Hominem",
        "Straw Man",
        "False Dilemma",
        "Slippery Slope",
        "Appeal to Authority",
        "Circular Reasoning",
        "Hasty Generalization",
        "Red Herring",
    ]
    quote: str = Field(min_length=1, max_length=400)
    explanation: str = Field(min_length=1, max_length=240)
    revision: str = Field(min_length=1, max_length=280)


class Counterargument(BaseModel):
    kind: Literal["Logical", "Evidence-based", "Ethical", "Practical", "Policy"]
    response: str = Field(min_length=1, max_length=320)
    question: str = Field(min_length=1, max_length=200)


class AnalysisReport(BaseModel):
    ratings: RubricRatings
    fallacies: list[FallacyFlag] = Field(max_length=8)
    strengths: list[str] = Field(min_length=1, max_length=3)
    next_steps: list[str] = Field(min_length=1, max_length=3)
    counterarguments: list[Counterargument] = Field(min_length=5, max_length=5)


class RubricBranch(BaseModel):
    ratings: RubricRatings
    strengths: list[str] = Field(min_length=1, max_length=3)
    next_steps: list[str] = Field(min_length=1, max_length=3)


class FallacyBranch(BaseModel):
    fallacies: list[FallacyFlag] = Field(max_length=8)


class CounterBranch(BaseModel):
    counterarguments: list[Counterargument] = Field(min_length=5, max_length=5)


class AnalysisGaps(BaseModel):
    gaps: list[str] = Field(default_factory=list, max_length=3)


class JudgeDimension(BaseModel):
    key: Literal["argument", "evidence", "logical", "rebuttal", "communication"]
    weight_pct: int = Field(ge=0, le=100)
    score: float = Field(ge=1, le=5)
    note: str = Field(min_length=1, max_length=280)
    citations: list[str] = Field(default_factory=list, max_length=4)


class JudgeVerdict(BaseModel):
    overall: float = Field(ge=1, le=5)
    dimensions: list[JudgeDimension] = Field(min_length=5, max_length=5)
    gaps: list[str] = Field(default_factory=list, max_length=3)


class PresentationSegment(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    start: float = Field(ge=0, le=3600)
    end: float = Field(ge=0, le=3600)


class DeliveryEvent(BaseModel):
    kind: Literal["rushed", "hesitant", "flat", "tense"]
    start: float = Field(ge=0, le=3600)
    end: float = Field(ge=0, le=3600)
    label: str = Field(min_length=1, max_length=60)
    detail: str = Field(min_length=1, max_length=280)


class DeliverySignals(BaseModel):
    wpm: float = Field(ge=0, le=400)
    words: int = Field(ge=0, le=20000)
    duration_sec: float = Field(ge=0, le=3600)
    filler_count: int = Field(ge=0)
    filler_rate_per_100w: float = Field(ge=0)
    pause_count: int = Field(ge=0)
    longest_pause_sec: float = Field(ge=0)
    repetition_count: int = Field(ge=0)
    revision_count: int = Field(ge=0)
    prolongation_count: int = Field(ge=0)
    events: list[DeliveryEvent] = Field(max_length=8)


class PresentationRequest(BaseModel):
    topic: str | None = Field(default=None, max_length=240)
    segments: list[PresentationSegment] = Field(min_length=1, max_length=60)
    signals: DeliverySignals


class DrillCard(BaseModel):
    start: float = Field(ge=0, le=3600)
    end: float = Field(ge=0, le=3600)
    pattern: Literal["rushed", "hesitant", "flat", "tense"]
    what_happened: str = Field(min_length=1, max_length=280)
    try_this: str = Field(min_length=1, max_length=280)
    example: str = Field(min_length=1, max_length=280)


class PresentationReport(BaseModel):
    transcript: str = Field(min_length=1, max_length=8000)
    communication_score: int = Field(ge=1, le=5)
    strengths: list[str] = Field(min_length=1, max_length=2)
    drills: list[DrillCard] = Field(min_length=1, max_length=4)
    next_line: str = Field(min_length=1, max_length=280)


class PresentationResponse(BaseModel):
    transcript: str = Field(min_length=1, max_length=8000)
    segments: list[PresentationSegment] = Field(min_length=1, max_length=60)
    signals: DeliverySignals
    report: PresentationReport
    retained: bool = False
    ser_reflection: list[dict] = Field(default_factory=list, max_length=8)
