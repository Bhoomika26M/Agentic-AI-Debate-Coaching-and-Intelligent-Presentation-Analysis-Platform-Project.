from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillUpdate(BaseModel):
    communication_score: int = Field(ge=0, le=100)
    critical_thinking_score: int = Field(ge=0, le=100)
    argumentation_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    presentation_score: int = Field(ge=0, le=100)


class SkillResponse(SkillUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    updated_at: datetime
