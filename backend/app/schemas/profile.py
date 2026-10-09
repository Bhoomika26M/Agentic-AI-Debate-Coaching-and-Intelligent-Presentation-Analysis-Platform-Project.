from datetime import datetime
from pydantic import BaseModel, Field

class ProfileBase(BaseModel):
    experience_level: str | None = Field(default=None, max_length=50)
    preferred_debate_topics: str | None = None
    presentation_domains: str | None = None
    learning_goals: str | None = None
    coaching_preferences: str | None = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileRead(ProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
