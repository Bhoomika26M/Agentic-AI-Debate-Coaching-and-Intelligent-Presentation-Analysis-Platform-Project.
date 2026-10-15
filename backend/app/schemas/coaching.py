from pydantic import BaseModel
from typing import List

class CoachingOut(BaseModel):
    id: str
    debate_exercises: List[str]
    presentation_exercises: List[str]
    reasoning_practice: List[str]
    weekly_goals: List[str]
    suggested_next: List[str]
    generated_at: str