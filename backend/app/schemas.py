from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import json


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    name: str
    bio: str
    role: str
    experience_level: str
    preferred_debate_topics: list[str]
    presentation_domains: list[str]
    learning_goals: list[str]
    coaching_preferences: dict
    tracked_skills: dict

    @field_validator("preferred_debate_topics", "presentation_domains", "learning_goals", mode="before")
    @classmethod
    def parse_lists(cls, value):
        return json.loads(value) if isinstance(value, str) else (value or [])

    @field_validator("coaching_preferences", "tracked_skills", mode="before")
    @classmethod
    def parse_dicts(cls, value):
        return json.loads(value) if isinstance(value, str) else (value or {})


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=3, max_length=500)
    position: str = Field(default="for", pattern="^(for|against)$")
    transcript: str = Field(default="", max_length=30000)
    scoring_weights: dict[str, float] | None = None


class CounterargumentRequest(BaseModel):
    claim: str = Field(min_length=3, max_length=1000)


class PresentationCreate(BaseModel):
    title: str = Field(default="Presentation practice", max_length=200)
    transcript: str = Field(min_length=1, max_length=30000)
    duration_seconds: float | None = Field(default=None, gt=0, le=86400)
    audience: str = Field(default="general", max_length=100)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    topic: str
    position: str
    transcript: str
    status: str
    overall_score: float
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    experience_level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced|expert)$")
    preferred_debate_topics: list[str] | None = None
    presentation_domains: list[str] | None = None
    learning_goals: list[str] | None = None
    coaching_preferences: dict | None = None
    tracked_skills: dict | None = None


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(learner|debate_coach|educator|administrator)$")


class DebateTurnRequest(BaseModel):
    session_id: int | None = None
    topic: str = Field(min_length=3, max_length=500)
    position: str = Field(default="for", pattern="^(for|against)$")
    transcript: str = Field(default="", max_length=30000)
    turn: int = Field(default=0, ge=0)
    content: str = Field(default="", max_length=10000)
    turn_type: str = Field(default="challenge", pattern="^(opening|challenge|rebuttal|final_evaluation)$")
