"""
Debate Simulation Router — Milestone 3
Endpoints:
 GET  /simulation/personas          - List all AI opponent personas
 POST /simulation/start             - Start a new simulation session
 POST /simulation/turn              - Submit user speech and get AI counter
 POST /simulation/counterarguments  - Generate counterarguments for an argument
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.models.user import User
from app.routers.users import get_current_user
from app.services.debate_simulation import simulation_engine

router = APIRouter(prefix="/simulation", tags=["AI Debate Simulation"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SimulationStartRequest(BaseModel):
    topic: str = Field(..., min_length=5, description="Debate motion or topic")
    user_position: str = Field("proposition", description="proposition or opposition")
    persona_key: str = Field("balanced", description="AI opponent persona key")
    total_turns: int = Field(6, ge=2, le=12, description="Number of turns in simulation")


class SimulationTurnRequest(BaseModel):
    session_id: str = Field(..., description="Simulation session identifier")
    topic: str = Field(..., description="Debate topic")
    user_speech: str = Field(..., min_length=10, description="User's speech text")
    persona_key: str = Field("balanced")
    turn_number: int = Field(..., ge=1)
    user_position: str = Field("proposition")
    history: list[dict] | None = Field(None, description="Previous turns history")


class CounterargumentRequest(BaseModel):
    argument_text: str = Field(..., min_length=20, description="Argument to counter")
    topic: str | None = Field(None, description="Debate topic for context")
    num_counters: int = Field(3, ge=1, le=5)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/personas")
async def get_personas(current_user: User = Depends(get_current_user)):
    """Retrieve all available AI opponent personas with descriptions."""
    return simulation_engine.get_personas()


@router.post("/start")
async def start_simulation(
    payload: SimulationStartRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Initialise an AI debate simulation session.
    Returns persona info and AI opening statement.
    """
    result = simulation_engine.start_simulation(
        session_id=f"sim_{current_user.id}_{payload.topic[:20].replace(' ', '_')}",
        topic=payload.topic,
        user_position=payload.user_position,
        persona_key=payload.persona_key,
        total_turns=payload.total_turns,
    )
    return result


@router.post("/turn")
async def process_turn(
    payload: SimulationTurnRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Submit user speech and receive AI counter-response + real-time coaching feedback.
    """
    result = simulation_engine.process_turn(
        session_id=payload.session_id,
        topic=payload.topic,
        user_speech=payload.user_speech,
        persona_key=payload.persona_key,
        turn_number=payload.turn_number,
        user_position=payload.user_position,
        history=payload.history,
    )
    return result


@router.post("/counterarguments")
async def generate_counterarguments(
    payload: CounterargumentRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate typed counterarguments (Logical, Evidence-Based, Ethical, Practical, Policy)
    for a given argument with challenge questions and debate strategies.
    """
    result = simulation_engine.generate_counterarguments(
        argument_text=payload.argument_text,
        topic=payload.topic,
        num_counters=payload.num_counters,
    )
    return result
