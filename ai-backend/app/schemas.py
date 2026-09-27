from typing import Literal

from pydantic import BaseModel, Field


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
