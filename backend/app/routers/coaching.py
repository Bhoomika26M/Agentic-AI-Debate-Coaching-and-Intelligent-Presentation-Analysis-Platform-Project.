"""
Coaching Router — Milestone 3
Endpoints:
 POST /coaching/recommendations   - Get personalised coaching recommendations
 POST /coaching/learning-plan     - Generate personalised learning plan
 POST /coaching/skill-gap         - Get skill gap analysis
 GET  /coaching/drills            - Browse drill library
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Literal

from app.models.user import User
from app.routers.users import get_current_user
from app.services.coaching import coaching_engine

router = APIRouter(prefix="/coaching", tags=["Coaching & Learning"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RecommendationRequest(BaseModel):
    scores: dict[str, float] = Field(
        ...,
        description="Skill scores: {argument_quality, evidence_usage, logical_consistency, rebuttal_effectiveness, communication_skills} each 0-100"
    )
    user_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    focus_areas: list[str] | None = None


class LearningPlanRequest(BaseModel):
    user_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    weak_skills: list[str] | None = None
    sessions_per_week: int = Field(3, ge=1, le=7)


class SkillGapRequest(BaseModel):
    scores: dict[str, float] = Field(
        ...,
        description="Skill scores 0-100 for each dimension"
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/recommendations")
async def get_recommendations(
    payload: RecommendationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate personalised coaching recommendations based on skill scores.
    Identifies weak areas, provides targeted exercises, and prioritises improvements.
    """
    return coaching_engine.generate_recommendations(
        scores=payload.scores,
        user_level=payload.user_level,
        focus_areas=payload.focus_areas,
    )


@router.post("/learning-plan")
async def get_learning_plan(
    payload: LearningPlanRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a personalised 4-week debate learning plan with weekly goals,
    targeted exercises, drills, and milestones.
    """
    return coaching_engine.generate_learning_plan(
        user_level=payload.user_level,
        weak_skills=payload.weak_skills,
        sessions_per_week=payload.sessions_per_week,
    )


@router.post("/skill-gap")
async def get_skill_gap(
    payload: SkillGapRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analyse skill gaps against the 80-point competitive benchmark.
    Returns prioritised gap-closing strategies and estimated improvement timelines.
    """
    return coaching_engine.get_skill_gap_analysis(scores=payload.scores)


@router.get("/drills")
async def get_drills(
    difficulty: str | None = Query(None, description="beginner | intermediate | advanced"),
    skill_type: str | None = Query(None, description="speaking | rebuttal | research | logic | argument | critical_thinking"),
    current_user: User = Depends(get_current_user),
):
    """Browse the debate drill library with optional difficulty and type filters."""
    return coaching_engine.get_drills(difficulty=difficulty, skill_type=skill_type)
