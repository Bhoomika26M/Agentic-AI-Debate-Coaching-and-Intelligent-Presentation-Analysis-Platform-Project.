from pydantic import BaseModel, ConfigDict, Field


class ProfileBase(BaseModel):
    experience_level: str | None = Field(default=None, max_length=50)
    preferred_topics: list[str] | None = None
    presentation_domains: list[str] | None = None
    learning_goals: str | None = Field(default=None, max_length=1000)
    coaching_preferences: dict | None = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
