from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class OpponentRequest(BaseModel):
    session_id: Optional[str] = None
    motion_text: str = Field(..., min_length=5)
    ai_persona: str = "Socratic Questioner"  # Socratic Questioner, Logical Professor, Aggressive Politician
    difficulty: str = "Intermediate"        # Beginner, Intermediate, Expert
    user_argument: str = Field(..., min_length=5)
    round_number: int = 1
    previous_turns: Optional[List[Dict[str, str]]] = Field(default_factory=list)

class OpponentResponse(BaseModel):
    ai_persona: str
    difficulty: str
    response_speech: str
    core_counterclaim: str
    rhetorical_strategy_used: str
    fallacies_exploited_in_user: List[str]
    challenge_question: str
    round_number: int

class CoachWhisperRequest(BaseModel):
    motion_text: str
    user_position: str = "proposition"
    current_user_speech: str
    ai_opponent_speech: Optional[str] = None

class CoachWhisperResponse(BaseModel):
    hint: str
    recommended_angle: str
    trap_to_avoid: str
    pacing_guidance: str

class PersonaInfo(BaseModel):
    id: str
    name: str
    title: str
    style_description: str
    strengths: List[str]
    weaknesses: List[str]
    default_difficulty: str
    avatar_url: Optional[str] = None
