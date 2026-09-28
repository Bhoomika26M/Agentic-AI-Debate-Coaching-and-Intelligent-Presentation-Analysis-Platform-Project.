from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from ..services.simulation_engine import simulation_engine
from .deps import get_current_active_user
from ..models.user import User

router = APIRouter(prefix="/simulation", tags=["simulation"])

class ConversationInput(BaseModel):
    history: List[Dict]
    difficulty: str = "medium"

class PerformanceInput(BaseModel):
    metrics: Dict

@router.post("/turn")
async def opponent_turn(input_data: ConversationInput, current_user: User = Depends(get_current_active_user)):
    result = await simulation_engine.generate_opponent_turn(input_data.history, input_data.difficulty)
    return result

@router.post("/coach")
async def get_coaching(input_data: PerformanceInput, current_user: User = Depends(get_current_active_user)):
    feedback = await simulation_engine.generate_coaching_feedback(input_data.metrics)
    score = simulation_engine.calculate_score(input_data.metrics)
    
    return {
        "coaching": feedback,
        "scoring": score
    }
