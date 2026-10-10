from datetime import datetime

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    position: str = Field(default="FOR", min_length=3, max_length=10)
    prompt: str | None = Field(default=None, min_length=10, max_length=5_000)


class SimulationScore(BaseModel):
    clarity: float = Field(ge=0, le=100)
    evidence: float = Field(ge=0, le=100)
    rebuttal_strength: float = Field(ge=0, le=100)
    overall: float = Field(ge=0, le=100)


class SimulationReport(BaseModel):
    id: str
    debate_id: str
    generated_by: str
    topic: str
    position: str
    opponent_position: str
    prompt: str
    opening_statement: str
    counterarguments: list[str]
    rebuttals: list[str]
    strengths: list[str]
    weaknesses: list[str]
    score: SimulationScore
    created_at: datetime
    updated_at: datetime
