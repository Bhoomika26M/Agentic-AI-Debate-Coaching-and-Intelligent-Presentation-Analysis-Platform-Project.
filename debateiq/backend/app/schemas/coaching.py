from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class DrillRecommendation(BaseModel):
    drill_id: str
    title: str
    category: str  # Fallacy Refutation, Evidence Retrieval, Rebuttal Speed, Syllogism Building
    estimated_minutes: int
    difficulty: str
    instruction: str
    sample_exercise: str

class LearningPlanCreate(BaseModel):
    title: str
    target_skill: str
    focus_areas: List[str]
    milestone_goals: List[str]

class LearningPlanResponse(BaseModel):
    id: str
    user_id: str
    title: str
    target_skill: str
    focus_areas: List[str]
    milestone_goals: List[str]
    prescribed_drills: List[Dict[str, Any]]
    status: str
    progress_percentage: float
    created_at: datetime

    class Config:
        from_attributes = True

class CoachingFeedbackResponse(BaseModel):
    strengths_observed: List[str]
    primary_skill_gap: str
    improvement_recommendations: List[str]
    personalized_drills: List[DrillRecommendation]
    encouragement: str
