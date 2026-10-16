from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.agents.planner import agent_planner
from app.agents.specialists.opponent_agent import AI_PERSONAS
from app.schemas.simulation import (
    OpponentResponse,
    CoachWhisperResponse,
    PersonaInfo,
)

class SimulationService:
    def __init__(self, db: Session):
        self.db = db

    def get_personas(self) -> List[PersonaInfo]:
        return AI_PERSONAS

    def spar(
        self,
        motion_text: str,
        user_argument: str,
        ai_persona: str = "Socratic Questioner",
        difficulty: str = "Intermediate",
        round_number: int = 1,
    ) -> OpponentResponse:
        return agent_planner.simulate_sparring_turn(
            motion_text=motion_text,
            user_speech=user_argument,
            ai_persona=ai_persona,
            difficulty=difficulty,
            round_number=round_number,
        )

    def whisper(
        self,
        motion_text: str,
        user_position: str,
        current_speech: str,
        opponent_speech: str = "",
    ) -> CoachWhisperResponse:
        return agent_planner.provide_coach_whisper(
            motion_text=motion_text,
            user_position=user_position,
            current_speech=current_speech,
            opponent_speech=opponent_speech,
        )
