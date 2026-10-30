from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class PresentationAnalysisOut(BaseModel):
    id: int
    title: str
    audio_filename: Optional[str]
    duration_seconds: float
    transcription: str
    words_per_minute: float
    speech_pace_label: str
    total_words: int
    filler_words_count: int
    filler_words_breakdown: Dict[str, int]
    repeated_words: List[str]
    pauses_detected: int
    confidence_score: float
    clarity_score: float
    audience_engagement_score: float
    overall_presentation_score: float
    strengths: List[str]
    weaknesses: List[str]
    improvement_recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CoachingRecommendationOut(BaseModel):
    id: int
    category: str
    title: str
    description: str
    priority: str
    recommended_exercises: List[Dict[str, Any]]
    personalized_learning_plan: List[str]
    suggested_debate_topics: List[str]
    communication_tips: List[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

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

class DashboardAnalyticsOut(BaseModel):
    total_debates: int
    debates_won: int
    win_rate: float
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
