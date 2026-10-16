from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.schemas.profile import ProfileResponse, SkillResponse, GoalResponse
from app.schemas.debate import SessionResponse
from app.schemas.scoring import SessionScoreRecordResponse

class LearnerDashboardResponse(BaseModel):
    user_id: str
    full_name: str
    role: str
    profile: ProfileResponse
    skills: SkillResponse
    recent_sessions: List[SessionResponse]
    recent_scores: List[SessionScoreRecordResponse]
    active_goals: List[GoalResponse]
    radar_data: List[Dict[str, Any]]
    score_trend: List[Dict[str, Any]]
    recommended_drills: List[Dict[str, Any]]

class StudentProgressItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    experience_level: str
    debater_level: int
    debater_xp: int
    average_score: float
    total_debates: int
    primary_weakness: str
    recent_fallacy_rate: float

class CoachDashboardResponse(BaseModel):
    coach_name: str
    total_students_monitored: int
    average_cohort_score: float
    students: List[StudentProgressItem]
    skill_gap_analysis: Dict[str, float]
    recent_session_reviews: List[Dict[str, Any]]

class EducatorDashboardResponse(BaseModel):
    educator_name: str
    total_classes: int
    total_students: int
    cohort_average_score: float
    top_performers: List[StudentProgressItem]
    needs_support: List[StudentProgressItem]
    format_mastery_breakdown: Dict[str, float]
    cohort_growth_rate: float

class AdminDashboardResponse(BaseModel):
    admin_name: str
    total_users: int
    role_distribution: Dict[str, int]
    total_debates_conducted: int
    total_turns_recorded: int
    ai_gateway_mode: str
    ai_requests_processed: int
    system_health: str
    uptime_seconds: float
