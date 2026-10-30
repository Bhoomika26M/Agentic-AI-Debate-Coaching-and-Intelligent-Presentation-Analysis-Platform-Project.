from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from app.core.timezone import UTCDateTime


class SkillUpdate(BaseModel):
    communication_score: int | None = Field(default=None, ge=0, le=100)
    critical_thinking_score: int | None = Field(default=None, ge=0, le=100)
    argumentation_score: int | None = Field(default=None, ge=0, le=100)
    confidence_score: int | None = Field(default=None, ge=0, le=100)
    presentation_score: int | None = Field(default=None, ge=0, le=100)


class SkillResponse(SkillUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    updated_at: UTCDateTime
    has_activity: bool = False
    provenance: dict[str, Any] | None = None
