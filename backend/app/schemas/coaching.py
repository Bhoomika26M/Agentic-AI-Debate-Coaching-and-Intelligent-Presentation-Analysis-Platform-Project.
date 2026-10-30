from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class CoachingRecommendationOut(BaseModel):
    id: int
    category: str
    title: str
    description: str
    priority: str
    recommended_exercises: List[Dict[str, Any]] = []
    personalized_learning_plan: List[str] = []
    suggested_debate_topics: List[str] = []
    communication_tips: List[str] = []
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
