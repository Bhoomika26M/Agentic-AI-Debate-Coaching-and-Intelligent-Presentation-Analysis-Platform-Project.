from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from app.core.timezone import OptUTCDateTime, UTCDateTime


class DebateCreate(BaseModel):
    topic: str = Field(min_length=2, max_length=255)
    description: str | None = None
    format: str = Field(pattern="^(one_on_one|parliamentary|oxford|policy|public_forum|ai_simulation)$")
    scheduled_at: datetime | None = None
    ai_opponent: bool = False
    position: str = Field(default="neutral", pattern="^(for|against|neutral)$")
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=255)


class DebateUpdate(BaseModel):
    topic: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    format: str | None = Field(default=None, pattern="^(one_on_one|parliamentary|oxford|policy|public_forum|ai_simulation)$")
    scheduled_at: datetime | None = None
    status: str | None = Field(default=None, pattern="^(scheduled|active|completed|cancelled)$")
    ai_opponent: bool | None = None


class DebateArgumentCreate(BaseModel):
    content: str = Field(min_length=10, max_length=5000)
    position: str = Field(default="neutral", pattern="^(for|against|neutral)$")
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=64)


class DebateArgumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    user_id: int
    turn_order: int
    role: str
    request_key: str | None = None
    position: str
    content: str
    is_ai: bool
    author_name: str
    created_at: UTCDateTime


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    user_id: int
    position: str
    is_ai: bool
    display_name: str
    joined_at: UTCDateTime


class DebateScore(BaseModel):
    score: int | None = Field(default=None, ge=0, le=100)
    explanation: str = Field(min_length=1, max_length=800)


class ImprovementPlan(BaseModel):
    strongest_skills: list[str] = Field(default_factory=list)
    areas_for_improvement: list[str] = Field(default_factory=list)
    practice_recommendations: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    measurable_next_debate_goal: str
    progress_indicators: list[str] = Field(default_factory=list)


class DebateCoachingAssessment(BaseModel):
    category_scores: dict[str, DebateScore]
    overall_assessment: str = Field(min_length=1, max_length=2000)
    strengths: list[str]
    weaknesses: list[str]
    improvement_suggestions: list[str]
    improvement_plan: ImprovementPlan


class DebateCoachingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    debate_id: int
    user_id: int
    category_scores: dict[str, DebateScore]
    overall_score: float | None = Field(ge=0, le=100)
    overall_assessment: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)
    improvement_plan: ImprovementPlan
    source_argument_count: int = 0
    created_at: UTCDateTime
    updated_at: UTCDateTime


class DebateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic: str
    description: str | None
    format: str
    scheduled_at: OptUTCDateTime = None
    created_by: int
    status: str
    ai_opponent: bool
    created_at: UTCDateTime
    participants: list[ParticipantResponse] = []
