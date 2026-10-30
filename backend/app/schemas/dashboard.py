from typing import Any
from pydantic import BaseModel


class LearnerDashboardData(BaseModel):
    total_debates: int
    total_arguments: int
    total_presentations: int
    average_debate_score: float | None
    average_presentation_score: float | None
    skills: dict[str, int | None]
    improvement_trends: list[dict[str, Any]]
    recent_debates: list[dict[str, Any]]
    recent_presentations: list[dict[str, Any]]
    recommended_exercises: list[str]
    coaching_insights: list[str]


class CoachDashboardData(BaseModel):
    total_students: int
    total_debates_evaluated: int
    students_overview: list[dict[str, Any]]
    recent_evaluations: list[dict[str, Any]]
    skill_gap_summary: list[dict[str, Any]]
    coaching_recommendations: list[str]


class EducatorDashboardData(BaseModel):
    class_size: int
    class_average_score: float | None
    student_rankings: list[dict[str, Any]]
    debate_performance_reports: list[dict[str, Any]]
    presentation_assessment_reports: list[dict[str, Any]]


class AdminDashboardData(BaseModel):
    platform_analytics: dict[str, Any]
    ai_model_monitoring: dict[str, Any]
    system_reports: dict[str, Any]
    recent_users: list[dict[str, Any]]


class DashboardOverviewResponse(BaseModel):
    active_role: str
    user_role: str
    learner_data: LearnerDashboardData | None = None
    coach_data: CoachDashboardData | None = None
    educator_data: EducatorDashboardData | None = None
    admin_data: AdminDashboardData | None = None
