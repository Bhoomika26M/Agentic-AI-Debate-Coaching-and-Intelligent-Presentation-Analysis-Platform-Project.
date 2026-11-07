from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────

class SessionCreate(BaseModel):
    user_id:          str | None = None  # target student (or assigned to learner)
    topic:            str = Field(..., min_length=5, max_length=500)
    format:           str = Field(..., min_length=3, max_length=60)
    position:         str | None = Field(None, max_length=60)
    notes:            str | None = None
    scheduled_at:     datetime | None = Field(default_factory=datetime.utcnow)
    round_count:      int = 1
    duration_minutes: int = 15
    transcript:       str | None = None
    recording_url:    str | None = None
    key_arguments:    list[str] | None = None
    class_id:         str | None = None


class SessionUpdate(BaseModel):
    topic:               str | None = None
    format:              str | None = None
    position:            str | None = None
    notes:               str | None = None
    status:              Literal["scheduled", "active", "completed", "cancelled", "expired"] | None = None
    scheduled_at:        datetime | None = None
    round_count:         int | None = None
    duration_minutes:    int | None = None
    transcript:          str | None = None
    recording_url:       str | None = None
    key_arguments:       list[str] | None = None
    score:               float | None = None
    feedback_summary:    str | None = None
    evaluation_criteria: dict | None = None
    class_id:            str | None = None


class SessionEvaluation(BaseModel):
    score:               float = Field(..., ge=0, le=100)
    feedback_summary:    str = Field(..., min_length=5)
    evaluation_criteria: dict | None = None


# ── Response schemas ─────────────────────────────────────────────

class SessionOut(BaseModel):
    id:                  str
    user_id:             str
    student_name:        str | None = None
    student_email:       str | None = None
    creator_id:          str | None = None
    creator_role:        str | None = None
    creator_name:        str | None = None
    class_id:            str | None = None
    topic:               str
    format:              str
    position:            str | None = None
    notes:               str | None = None
    status:              str | None = "scheduled"
    scheduled_at:        datetime | None = None
    round_count:         int | None = 1
    duration_minutes:    int | None = 15
    transcript:          str | None = None
    recording_url:       str | None = None
    key_arguments:       list[str] | None = None
    score:               float | None = None
    feedback_summary:    str | None = None
    evaluation_criteria: dict | None = None
    created_at:          datetime | None = None
    updated_at:          datetime | None = None

    model_config = {"from_attributes": True}
