from typing import Optional, List
from pydantic import BaseModel, Field
from app.services.simulation_engine import OpponentPersona, Counterargument, PointOfInformation, SimulationTurnResponse
from app.services.coaching_engine import PersonalizedLearningPathway

class SimulationTurnRequest(BaseModel):
    motion: str = Field(..., min_length=5, description="Debate motion under deliberation")
    user_speech: str = Field(..., min_length=10, description="Transcript of the user's speech")
    turn_number: int = Field(1, ge=1, description="Current speech turn in the debate")
    persona: OpponentPersona = OpponentPersona.SOCRATIC

class POIRequest(BaseModel):
    motion: str
    user_speech: str
    persona: OpponentPersona = OpponentPersona.SOCRATIC

class CoachingPathwayRequest(BaseModel):
    weakest_skill: Optional[str] = "LOGIC"
    current_composite: Optional[float] = 65.0
