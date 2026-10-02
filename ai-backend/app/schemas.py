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
