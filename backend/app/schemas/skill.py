from datetime import datetime
from pydantic import BaseModel, Field

class SkillUpdate(BaseModel):
    communication_score: int = Field(ge=0, le=100)
    critical_thinking_score: int = Field(ge=0, le=100)
    debate_score: int = Field(ge=0, le=100)
    presentation_score: int = Field(ge=0, le=100)

class SkillRead(SkillUpdate):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
