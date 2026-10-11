from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = "Learner"


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProfileUpdate(BaseModel):
    experience_level: str | None = None
    preferred_topics: str | None = None
    presentation_domains: str | None = None
    learning_goals: str | None = None
    coaching_preferences: str | None = None


class ProfileResponse(ProfileUpdate):
    id: int
    user_id: int

    class Config:
        from_attributes = True

        


class RoleUpdate(BaseModel):
    role: Literal[
        "Learner",
        "Debate Coach",
        "Educator",
        "Administrator",
    ]

    
class StaffRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["Debate Coach", "Educator"]


class DebateSessionCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=255)
    debate_format: str = Field(min_length=2, max_length=100)
    position: str = Field(min_length=2, max_length=50)


class DebateSessionResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    debate_format: str
    position: str
    status: str
    transcript: str | None = None

    class Config:
        from_attributes = True


from datetime import datetime
from pydantic import BaseModel, Field


class SkillAssessmentCreate(BaseModel):
    debate_id: int | None = None
    text: str = Field(min_length=1)
    claim: str | None = None
    evidence: str | None = None

    reasoning_quality: float = Field(ge=0, le=100)
    evidence_strength: float = Field(ge=0, le=100)
    logical_consistency: float = Field(ge=0, le=100)
    persuasiveness: float = Field(ge=0, le=100)
    argument_score: float = Field(ge=0, le=100)

    fallacies: str | None = None
    feedback: str | None = None


class SkillAssessmentResponse(BaseModel):
    id: int
    user_id: int
    debate_id: int | None = None
    text: str
    claim: str | None = None
    evidence: str | None = None

    reasoning_quality: float | None = None
    evidence_strength: float | None = None
    logical_consistency: float | None = None
    persuasiveness: float | None = None
    argument_score: float | None = None

    fallacies: str | None = None
    feedback: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PresentationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    presentation_domain: str | None = Field(
        default=None,
        max_length=100,
    )
    duration_seconds: int | None = Field(
        default=None,
        ge=0,
    )
    transcript: str | None = None


class PresentationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    presentation_domain: str | None = None
    duration_seconds: int | None = None
    transcript: str | None = None
    status: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ArgumentAnalysisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)



class ArgumentAnalysisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
