from typing import Literal, TypedDict


class DebateTurnState(TypedDict):
    speaker: Literal["learner", "opponent"]
    content: str


class DebateState(TypedDict, total=False):
    topic: str
    learner_position: str
    persona: str
    difficulty: str
    history: list[DebateTurnState]
    latest: str | None
    route: Literal["respond", "redirect"]
    reply: str


class AnalysisState(TypedDict, total=False):
    topic: str
    learner_position: str
    turns: list[DebateTurnState]
    persona: str | None
    difficulty: str | None
    report: dict
    gaps: list[str]


class DeliveryState(TypedDict, total=False):
    topic: str | None
    segments: list[dict]
    signals: dict
    report: dict
    gaps: list[str]
