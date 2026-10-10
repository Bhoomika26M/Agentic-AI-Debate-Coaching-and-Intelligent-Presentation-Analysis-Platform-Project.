from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database.database import get_db
from app.database.helpers import oid
from app.dependencies.auth import get_current_user
from app.schemas.simulation import SimulationReport, SimulationRequest
from app.services.coaching_service import build_learning_dashboard
from app.services.simulation_service import build_simulation, public_simulation, save_simulation

router = APIRouter(prefix="/api", tags=["coaching"])


def _debate_or_404(database: Database, debate_id: str) -> dict:
    try:
        debate = database.debates.find_one({"_id": oid(debate_id)})
    except ValueError as exc:
        raise HTTPException(404, "Debate session not found") from exc
    if debate is None:
        raise HTTPException(404, "Debate session not found")
    return debate


@router.post("/debates/{debate_id}/simulation", response_model=SimulationReport, status_code=201)
@router.post("/debates/{debate_id}/simulate", response_model=SimulationReport, status_code=201)
def create_simulation(
    debate_id: str,
    payload: SimulationRequest,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> dict:
    debate = _debate_or_404(database, debate_id)
    report = save_simulation(database, debate, user, payload.model_dump())
    return public_simulation(report)


@router.get("/debates/{debate_id}/simulation", response_model=SimulationReport)
@router.get("/debates/{debate_id}/simulations", response_model=SimulationReport)
@router.get("/debates/{debate_id}/simulate", response_model=SimulationReport)
def get_simulation(
    debate_id: str,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> dict:
    debate = _debate_or_404(database, debate_id)
    report = database.simulation_reports.find_one({"debate_id": debate["_id"]})
    if report is None:
        raise HTTPException(404, "Simulation report not found")
    return public_simulation(report)


@router.get("/coaching/dashboard")
@router.get("/coaching/plan")
@router.get("/skills/me/coaching")
@router.get("/users/me/dashboard")
def get_dashboard(
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> dict:
    skills = database.skills.find_one({"user_id": user["_id"]})
    result = build_learning_dashboard(user, skills)
    history = list(database.simulation_attempts.find({"user_id": user["_id"]}).sort("created_at", -1).limit(10))
    result["simulation_history"] = [
        {
            "id": str(item["_id"]),
            "debate_id": str(item["debate_id"]),
            "topic": item["topic"],
            "position": item["position"],
            "overall": item["score"]["overall"],
            "created_at": item["created_at"],
        }
        for item in history
    ]
    return result


@router.get("/profiles/me/coaching")
def get_profile_coaching(
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> dict:
    skills = database.skills.find_one({"user_id": user["_id"]})
    return build_learning_dashboard(user, skills)


@router.get("/debates/{debate_id}/coaching")
def get_debate_coaching(
    debate_id: str,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> dict:
    debate = _debate_or_404(database, debate_id)
    skills = database.skills.find_one({"user_id": user["_id"]})
    result = build_learning_dashboard(user, skills)
    result["debate_topic"] = debate.get("topic", "General debate topic")
    result["simulation"] = build_simulation(debate.get("topic", "General debate topic"), "FOR")
    return result


@router.get("/simulations/history")
def get_simulation_history(
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_db),
) -> list[dict]:
    return [
        {
            "id": str(item["_id"]),
            "debate_id": str(item["debate_id"]),
            "topic": item["topic"],
            "position": item["position"],
            "score": item["score"],
            "created_at": item["created_at"],
        }
        for item in database.simulation_attempts.find({"user_id": user["_id"]}).sort("created_at", -1).limit(50)
    ]
