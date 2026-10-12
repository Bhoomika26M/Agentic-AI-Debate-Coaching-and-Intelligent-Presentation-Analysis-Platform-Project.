import operator
from typing import Annotated, Literal, NotRequired, TypedDict


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
    preferences: dict | None
    route: Literal["respond", "redirect"]
    memory: list[dict]
    memory_brief: str | None
    brief: str | None
    draft: str
    reply: str
    problems: list[str]
    revise_count: int
    verified: bool
    replaced: bool


class AnalysisState(TypedDict, total=False):
    topic: str
    learner_position: str
    turns: list[DebateTurnState]
    persona: str | None
    difficulty: str | None
    report: dict | None
    gaps: list[str]
    branch_reports: NotRequired[Annotated[list[dict], operator.add]]


class JudgeState(TypedDict, total=False):
    report: dict
    delivery: dict
    dimensions: NotRequired[Annotated[list[dict], operator.add]]
    verdict: dict | None
    gaps: list[str]


class PlanState(TypedDict, total=False):
    goals: str | None
    experience: str | None
    preferences: dict | None
    digests: list[dict]
    averages: dict[str, float]
    weak_spots: list[dict]
    use_model: bool
    model_skipped: bool
    draft: dict | None
    problems: list[str]
    fallback_used: bool
    plan: dict | None
    gaps: list[str]
    repair_count: int


class DeliveryState(TypedDict, total=False):
    topic: str | None
    audio: bytes
    filename: str
    content_type: str
    segments: list[dict]
    signals: dict
    report: dict
    gaps: list[str]
