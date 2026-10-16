from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.simulation_service import SimulationService
from app.schemas.simulation import (
    OpponentRequest,
    OpponentResponse,
    CoachWhisperRequest,
    CoachWhisperResponse,
    PersonaInfo,
)

router = APIRouter(prefix="/simulation", tags=["AI Simulation & Personas"])

@router.get("/personas", response_model=List[PersonaInfo])
def get_personas(db: Session = Depends(get_db)):
    service = SimulationService(db)
    return service.get_personas()

@router.post("/spar", response_model=OpponentResponse)
def spar_turn(req: OpponentRequest, db: Session = Depends(get_db)):
    service = SimulationService(db)
    return service.spar(
        motion_text=req.motion_text,
        user_argument=req.user_argument,
        ai_persona=req.ai_persona,
        difficulty=req.difficulty,
        round_number=req.round_number,
    )

@router.post("/whisper", response_model=CoachWhisperResponse)
def coach_whisper(req: CoachWhisperRequest, db: Session = Depends(get_db)):
    service = SimulationService(db)
    return service.whisper(
        motion_text=req.motion_text,
        user_position=req.user_position,
        current_speech=req.current_user_speech,
        opponent_speech=req.ai_opponent_speech or "",
    )
