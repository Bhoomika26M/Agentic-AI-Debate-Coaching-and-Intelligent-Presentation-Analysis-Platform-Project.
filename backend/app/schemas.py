from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ---------- Auth / Users ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "learner"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    experience_level: str
    preferred_topics: str
    learning_goals: str

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    experience_level: Optional[str] = None
    preferred_topics: Optional[str] = None
    learning_goals: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Debate Sessions ----------

class DebateSessionCreate(BaseModel):
    topic: str
    debate_format: str = "one_on_one"
    position: str = "for"


class DebateSessionOut(BaseModel):
    id: int
    topic: str
    debate_format: str
    position: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Arguments / Analysis ----------

class ArgumentCreate(BaseModel):
    session_id: int
    text: str


class FallacyOut(BaseModel):
    type: str
    snippet: str
    explanation: str
    suggestion: str


class CounterargumentOut(BaseModel):
    type: str
    text: str


class AnalysisOut(BaseModel):
    id: int
    argument_id: int
    clarity: float
    relevance: float
    evidence_strength: float
    logical_consistency: float
    persuasiveness: float

    argument_quality_score: float
    evidence_usage_score: float
    logical_consistency_score: float
    rebuttal_effectiveness_score: float
    communication_skills_score: float
    overall_score: float

    fallacies: List[FallacyOut]
    counterarguments: List[CounterargumentOut]
    claims: List[str]
    recommendations: List[str]

    class Config:
        from_attributes = True


class ArgumentOut(BaseModel):
    id: int
    session_id: int
    text: str
    created_at: datetime
    analysis: Optional[AnalysisOut] = None

    class Config:
        from_attributes = True


# ---------- Dashboard ----------

class DashboardOut(BaseModel):
    total_sessions: int
    total_arguments: int
    average_overall_score: float
    average_scores_by_criterion: dict
    fallacy_frequency: dict
    score_trend: List[float]
    top_recommendations: List[str]
