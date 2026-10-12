from typing import Literal

from pydantic import BaseModel, Field, model_validator

FallacyLabel = Literal[
    "Ad Hominem",
    "Straw Man",
    "False Dilemma",
    "Slippery Slope",
    "Appeal to Authority",
    "Circular Reasoning",
    "Hasty Generalization",
    "Red Herring",
]

CriterionKey = Literal[
    "clarity",
    "relevance",
    "evidence_strength",
    "logical_consistency",
    "persuasiveness",
]

WeakSpotKey = Literal[
    "clarity",
    "relevance",
    "evidence_strength",
    "logical_consistency",
    "persuasiveness",
    "delivery",
    "fallacy_control",
    "practice_volume",
]


GoalKey = Literal["structure", "evidence", "nerves", "hostile", "win"]
PurposeKey = Literal["school", "university", "interview", "confidence", "competition"]
FocusKey = Literal["argument", "delivery", "confidence"]


class PracticePreferences(BaseModel):
    """The learner's own onboarding answers, used to aim practice at what they asked for."""

    goal: GoalKey | None = None
    purpose: PurposeKey | None = None
    focus: list[FocusKey] = Field(default_factory=list, max_length=3)


class DebateTurn(BaseModel):
    speaker: Literal["learner", "opponent"]
    content: str = Field(min_length=1, max_length=4000)


class SessionDigest(BaseModel):
    """One finished rehearsal, reduced by the browser to a compact record (oldest first)."""

    ratings: "RubricRatings | None" = None
    fallacy_labels: list[FallacyLabel] = Field(default_factory=list, max_length=8)
    filler_rate_per_100w: float | None = Field(default=None, ge=0, le=200)


class DebateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=240)
    learner_position: Literal["for", "against"]
    persona: Literal["strategist", "skeptic", "diplomat"]
    difficulty: Literal["warm-up", "challenge", "cross-examination"]
    history: list[DebateTurn] = Field(default_factory=list, max_length=20)
    learner_argument: str | None = Field(default=None, max_length=4000)
    memory: list[SessionDigest] = Field(default_factory=list, max_length=12)
    preferences: PracticePreferences | None = None


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


SessionDigest.model_rebuild()


class FallacyFlag(BaseModel):
    label: FallacyLabel
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


class AnalysisEnvelope(BaseModel):
    ratings: RubricRatings | None = None
    fallacies: list[FallacyFlag] = Field(default_factory=list, max_length=8)
    strengths: list[str] = Field(default_factory=list, max_length=3)
    next_steps: list[str] = Field(default_factory=list, max_length=3)
    counterarguments: list[Counterargument] = Field(default_factory=list, max_length=5)
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


class ChallengeTurn(BaseModel):
    speaker: Literal["learner", "opponent"]
    content: str = Field(min_length=1, max_length=4000)


class ChallengeRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=240)
    history: list[ChallengeTurn] = Field(default_factory=list, max_length=20)
    latest: str = Field(min_length=1, max_length=4000)
    depth: int = Field(ge=0, le=2)
    preferences: PracticePreferences | None = None


class ChallengeResponse(BaseModel):
    done: bool = False
    target_sentence: str | None = Field(default=None, max_length=400)
    follow_up: str | None = Field(default=None, max_length=400)
    depth: int = Field(ge=0, le=2)


class PresentationResponse(BaseModel):
    transcript: str = Field(min_length=1, max_length=8000)
    segments: list[PresentationSegment] = Field(min_length=1, max_length=60)
    signals: DeliverySignals
    report: PresentationReport
    retained: bool = False
    ser_reflection: list[dict] = Field(default_factory=list, max_length=8)


class JudgeRequest(BaseModel):
    report: AnalysisReport
    delivery: PresentationResponse | None = None


class PlanWeakSpot(BaseModel):
    key: WeakSpotKey
    label: str = Field(min_length=3, max_length=80)
    evidence: str = Field(min_length=3, max_length=240)
    first_step: str = Field(min_length=3, max_length=240)


class PlanDrill(BaseModel):
    weak_spot: WeakSpotKey
    title: str = Field(min_length=3, max_length=80)
    minutes: int = Field(ge=3, le=30)
    steps: list[str] = Field(min_length=1, max_length=3)
    success_check: str = Field(min_length=5, max_length=200)


class PlanMilestone(BaseModel):
    week: int = Field(ge=1, le=6)
    focus: list[WeakSpotKey] = Field(min_length=1, max_length=3)
    practice: str = Field(min_length=5, max_length=240)
    win_condition: str = Field(min_length=5, max_length=200)


class PlanRequest(BaseModel):
    goals: str | None = Field(default=None, max_length=500)
    experience: Literal["new", "developing", "confident"] | None = None
    digests: list[SessionDigest] = Field(default_factory=list, max_length=12)
    preferences: PracticePreferences | None = None


class LearningPlan(BaseModel):
    headline: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=3, max_length=400)
    weak_spots: list[PlanWeakSpot] = Field(min_length=1, max_length=4)
    drills: list[PlanDrill] = Field(min_length=1, max_length=6)
    milestones: list[PlanMilestone] = Field(min_length=1, max_length=4)
    next_session: str = Field(min_length=3, max_length=240)
    generated_for: int = Field(ge=0, le=12)
    gaps: list[str] = Field(default_factory=list, max_length=3)


class PlanResponse(BaseModel):
    plan: LearningPlan
    gaps: list[str] = Field(default_factory=list, max_length=3)


class PlanBranches(BaseModel):
    """Schema handed to the model: only the branches it is allowed to write."""

    headline: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=3, max_length=400)
    drills: list[PlanDrill] = Field(min_length=1, max_length=6)
    milestones: list[PlanMilestone] = Field(min_length=1, max_length=4)
    next_session: str = Field(min_length=3, max_length=240)
