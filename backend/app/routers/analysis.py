from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import UserRole
from app.schemas.analysis import AnalysisReport, AnalysisRequest
from app.services.analysis_service import public_analysis, save_analysis
from app.routers.debates import _find

router = APIRouter(prefix="/api/debates", tags=["analysis"])


def _authorized(debate: dict, user: dict, database: Database) -> bool:
    return debate["created_by"] == user["_id"] or user["role"] == UserRole.ADMINISTRATOR or database.participants.find_one({"debate_id": debate["_id"], "user_id": user["_id"]}) is not None


def _debate_or_404(debate_id: str, database: Database) -> dict:
    debate = _find(database, debate_id)
    if debate is None:
        raise HTTPException(404, "Debate session not found")
    return debate


@router.post("/{debate_id}/analysis", response_model=AnalysisReport)
def create_analysis(debate_id: str, payload: AnalysisRequest, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    debate = _debate_or_404(debate_id, database)
    if not _authorized(debate, user, database):
        raise HTTPException(403, "Only debate participants, the creator, or an administrator can analyze this debate")
    return public_analysis(save_analysis(database, debate, user, payload.transcript))


@router.get("/{debate_id}/analysis", response_model=AnalysisReport)
def get_analysis(debate_id: str, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    debate = _debate_or_404(debate_id, database)
    if not _authorized(debate, user, database):
        raise HTTPException(403, "Only debate participants, the creator, or an administrator can view this analysis")
    report = database.analysis_reports.find_one({"debate_id": debate["_id"]})
    if report is None:
        raise HTTPException(404, "Analysis report not found")
    return public_analysis(report)
