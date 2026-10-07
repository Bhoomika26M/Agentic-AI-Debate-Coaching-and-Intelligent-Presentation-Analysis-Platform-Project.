from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ── Request schemas ──────────────────────────────────────────────

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email:     EmailStr
    password:  str = Field(..., min_length=8)
    role:      Literal["learner", "coach", "educator", "admin"] = "learner"


class UserUpdate(BaseModel):
    full_name:            str | None = Field(None, min_length=2, max_length=120)
    email:                EmailStr | None = None
    bio:                  str | None = Field(None, max_length=500)
    experience_level:     str | None = None
    debate_topics:        list[str] | None = None
    presentation_domains: list[str] | None = None
    learning_goals:       list[str] | None = None
    coaching_prefs:       list[str] | None = None
    communication_skills: dict | None = None
    presentation_history: list[dict] | None = None


# ── Response schemas ─────────────────────────────────────────────

class UserOut(BaseModel):
    id:                   str
    full_name:            str
    email:                str
    role:                 str
    is_active:            bool
    bio:                  str | None = None
    experience_level:     str | None = None
    debate_topics:        list[str] | None = None
    presentation_domains: list[str] | None = None
    learning_goals:       list[str] | None = None
    coaching_prefs:       list[str] | None = None
    communication_skills: dict | None = None
    presentation_history: list[dict] | None = None
    total_sessions:       int = 0
    avg_score:            float = 0.0
    win_streak:           int = 0
    created_at:           datetime
    updated_at:           datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut
