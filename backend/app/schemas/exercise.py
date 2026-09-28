from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class ExerciseAttemptSubmit(BaseModel):
    user_submission: str

class ExerciseAttemptResponse(BaseModel):
    id: int
    exercise_id: int
    ai_score: float
    ai_feedback: str
    is_completed: bool
    completed_at: datetime

    class Config:
        from_attributes = True

class ExerciseDetailResponse(BaseModel):
    id: int
    title: str
    category: str
    difficulty: str
    prompt: str
    sample_solution: Optional[str] = None
    is_completed: bool = False
    last_score: Optional[float] = None

    class Config:
        from_attributes = True
