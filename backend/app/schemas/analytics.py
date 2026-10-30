from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class DashboardAnalyticsOut(BaseModel):
    total_debates: int
    debates_won: int
    win_rate: float
    average_score: float
    rooms_hosted: int
    followers: int
    following: int
    subscription_plan: str
    subscription_status: str
    monthly_debates: List[Dict[str, Any]]
    win_distribution: List[Dict[str, Any]]
    weekly_activity: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    skills_radar: List[Dict[str, Any]]

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
