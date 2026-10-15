from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class DebateCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    format: str = "one_on_one"
    position: str = Field(pattern="^(FOR|AGAINST)$")
    difficulty: str = "intermediate"
    opening_argument: str = Field(min_length=10)

class DebateMessageOut(BaseModel):
    id: str
    sender: str
    content: str
    turn_number: int
    created_at: datetime
    class Config:
        from_attributes = True

class DebateOut(BaseModel):
    id: str
    topic: str
    format: str
    position: str
    difficulty: str
    status: str
    created_at: datetime
    messages: List[DebateMessageOut] = []
    class Config:
        from_attributes = True

class DebateTurnRequest(BaseModel):
    content: str = Field(min_length=5)