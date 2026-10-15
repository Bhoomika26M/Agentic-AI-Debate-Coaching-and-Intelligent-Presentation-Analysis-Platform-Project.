from pydantic import BaseModel
from typing import List

class LearnerDashboard(BaseModel):
    total_debates: int
    total_presentations: int
    average_score: float
    recent_sessions: List[dict]
    score_trend: List[dict]
    strengths: List[str]
    weaknesses: List[str]
    recent_feedback: List[dict]

class AdminDashboard(BaseModel):
    total_users: int
    role_counts: dict
    total_debates: int
    total_presentations: int
    total_analyses: int
    recent_users: List[dict]