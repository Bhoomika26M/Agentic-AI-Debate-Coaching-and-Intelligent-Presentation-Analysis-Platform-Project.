from typing import Any
from pydantic import BaseModel


class LearningPathPhase(BaseModel):
    phase: int
    title: str
    focus_skills: list[str]
    description: str
    recommended_exercises: list[str]
    status: str  # "completed", "in_progress", "upcoming"


class LearningPathResponse(BaseModel):
    user_id: int
    current_level: str
    overall_progress_pct: int
    skill_gaps: list[dict[str, Any]]
    phases: list[LearningPathPhase]
    personalized_coaching_insights: list[str]
