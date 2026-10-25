from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.models import User
from app.services.simulation_engine import simulation_engine, OpponentPersona, SimulationTurnResponse, PointOfInformation
from app.services.coaching_engine import coaching_engine, PersonalizedLearningPathway
from app.schemas.simulation import (
    SimulationTurnRequest,
    POIRequest,
    CoachingPathwayRequest
)

router = APIRouter()

@router.get("/personas")
async def list_opponent_personas(current_user: User = Depends(get_current_user)):
    """
    List available autonomous debate sparring partner personas.
    """
    return [
        {
            "id": persona.value,
            **profile
        }
        for persona, profile in simulation_engine.PERSONA_PROFILES.items()
    ]

@router.post("/turn", response_model=SimulationTurnResponse)
async def process_simulation_turn(
    request: SimulationTurnRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Process a user debate turn: generates an AI opponent speech rebuttal,
    identifies primary & alternative counterarguments (Logical, Empirical, Ethical, Practical, Policy),
    and creates a cross-examination challenge.
    """
    turn_response = simulation_engine.generate_simulation_turn(
        motion=request.motion,
        user_speech=request.user_speech,
        turn_number=request.turn_number,
        persona=request.persona
    )
    return turn_response

@router.post("/poi", response_model=PointOfInformation)
async def generate_point_of_information(
    request: POIRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a sudden 15-second Point of Information (POI) challenge during speech delivery.
    """
    poi = simulation_engine.generate_poi(
        motion=request.motion,
        user_speech=request.user_speech,
        persona=request.persona
    )
    return poi

@router.post("/coaching-pathway", response_model=PersonalizedLearningPathway)
async def get_personalized_learning_pathway(
    request: CoachingPathwayRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate tailored forensic coaching roadmap with targeted practice drills
    based on observed debate weaknesses.
    """
    pathway = coaching_engine.generate_pathway(
        user_id=current_user.id,
        weakest_skill=request.weakest_skill or "LOGIC",
        current_composite=request.current_composite or 65.0
    )
    return pathway
