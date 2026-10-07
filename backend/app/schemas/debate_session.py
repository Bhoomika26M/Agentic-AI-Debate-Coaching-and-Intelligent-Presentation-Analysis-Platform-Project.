from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────

class SessionCreate(BaseModel):
    topic:            str = Field(..., min_length=5, max_length=500)
    format:           str = Field(..., min_length=3, max_length=60)
    position:         str | None = Field(None, max_length=60)
    notes:            str | None = None
    scheduled_at:     datetime
    round_count:      int = 1
    duration_minutes: int = 15
    transcript:       str | None = None
    recording_url:    str | None = None
    key_arguments:    list[str] | None = None


class SessionUpdate(BaseModel):
    topic:               str | None = None
    format:              str | None = None
    position:            str | None = None
    notes:               str | None = None
    status:              Literal["scheduled", "active", "completed", "cancelled"] | None = None
    scheduled_at:        datetime | None = None
    round_count:         int | None = None
    duration_minutes:    int | None = None
    transcript:          str | None = None
    recording_url:       str | None = None
    key_arguments:       list[str] | None = None
    score:               float | None = None
    feedback_summary:    str | None = None
    evaluation_criteria: dict | None = None


class SessionEvaluation(BaseModel):
    score:               float = Field(..., ge=0, le=100)
    feedback_summary:    str = Field(..., min_length=5)
    evaluation_criteria: dict | None = None


# ── Response schemas ─────────────────────────────────────────────

class SessionOut(BaseModel):
    id:                  str
    user_id:             str
    topic:               str
    format:              str
    position:            str | None = None
    notes:               str | None = None
    status:              str
    scheduled_at:        datetime
    round_count:         int = 1
    duration_minutes:    int = 15
    transcript:          str | None = None
    recording_url:       str | None = None
    key_arguments:       list[str] | None = None
    score:               float | None = None
    feedback_summary:    str | None = None
    evaluation_criteria: dict | None = None
    created_at:          datetime
    updated_at:          datetime

    model_config = {"from_attributes": True}
