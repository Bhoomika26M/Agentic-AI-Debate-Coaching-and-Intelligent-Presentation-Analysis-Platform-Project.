from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DebateSessionBase(BaseModel):
    title: str
    format: str = "One-on-One"
    scheduled_time: Optional[datetime] = None
    status: str = "scheduled"

class DebateSessionCreate(DebateSessionBase):
    pass

class DebateSession(DebateSessionBase):
    id: int
    host_id: int

    class Config:
        from_attributes = True
