from typing import Literal
from pydantic import BaseModel, Field


class CounterargumentRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=255)
    argument_text: str = Field(min_length=10, max_length=10000)
    position: Literal["for", "against", "neutral"] = "neutral"


class CounterargumentItem(BaseModel):
    type: Literal[
        "Logical Rebuttals",
        "Evidence-Based Rebuttals",
        "Ethical Counterarguments",
        "Practical Counterarguments",
        "Policy Counterarguments",
    ]
    claim: str
    rebuttal: str
    counterpoint: str


class CounterargumentResponse(BaseModel):
    topic: str
    counterarguments: list[CounterargumentItem]
    alternative_perspectives: list[str]
    challenge_questions: list[str]
    debate_strategies: list[str]
