from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SkillScore(BaseModel):
    name: str
    category: str
    current_score: float
    historical_scores: List[Dict[str, Any]] = []

class LearnerDashboardResponse(BaseModel):
    overall_performance_score: float
    debate_score: float
    presentation_score: float
    critical_thinking_score: float
    communication_score: float
    
    recent_debates: List[Dict[str, Any]]
    recent_presentations: List[Dict[str, Any]]
    improvement_trends: Dict[str, Any]
    weakest_skills: List[str]
    strongest_skills: List[str]
    recommended_exercises: List[Dict[str, Any]]
    coaching_insights: List[str]
    learning_goals: List[Dict[str, Any]]
    current_learning_streak: int
    upcoming_practice_sessions: List[Dict[str, Any]]
    
    # Interactive chart series
    performance_over_time: List[Dict[str, Any]]
    skill_radar: List[Dict[str, Any]]
    fallacy_frequency: List[Dict[str, Any]]
    speaking_pace_trends: List[Dict[str, Any]]
    filler_word_trends: List[Dict[str, Any]]

class CoachDashboardResponse(BaseModel):
    total_students: int
    active_students: int
    average_student_score: float
    students_list: List[Dict[str, Any]]
    skill_gap_analysis: List[Dict[str, Any]]
    recent_evaluations: List[Dict[str, Any]]
    coaching_recommendations: List[Dict[str, Any]]

class EducatorDashboardResponse(BaseModel):
    class_name: str
    total_enrolled: int
    average_class_score: float
    debate_average: float
    presentation_average: float
    student_rankings: List[Dict[str, Any]]
    skill_distribution: List[Dict[str, Any]]
    weakest_class_skills: List[str]
    improvement_trends: List[Dict[str, Any]]

class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    total_debates: int
    total_presentations: int
    ai_sessions: int
    average_performance: float
    role_breakdown: Dict[str, int]
    ai_monitoring: Dict[str, Any]
    system_status: Dict[str, Any]
