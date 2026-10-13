import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.skill import SkillType


class SkillRecordCreate(BaseModel):
    skill_type: SkillType
    score: float
    source: Optional[str] = "manual"

    @field_validator("score")
    @classmethod
    def score_range(cls, v: float) -> float:
        if not (0.0 <= v <= 10.0):
            raise ValueError("Score must be between 0.0 and 10.0")
        return v


class SkillRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    skill_type: SkillType
    score: float
    recorded_at: datetime
    source: Optional[str]


class SkillSummaryItem(BaseModel):
    """Latest score per skill + trend (difference from previous reading)."""
    skill_type: SkillType
    latest_score: float
    previous_score: Optional[float]
    trend: Optional[float]  # positive = improving, negative = declining


class SkillSummary(BaseModel):
    skills: list[SkillSummaryItem]
