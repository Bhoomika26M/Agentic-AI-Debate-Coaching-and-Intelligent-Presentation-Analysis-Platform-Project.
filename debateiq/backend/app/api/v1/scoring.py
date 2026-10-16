from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.scoring_service import ScoringService
from app.schemas.scoring import ScoringRequest, ScoringResponse

router = APIRouter(prefix="/scoring", tags=["Weighted Performance Scoring"])

@router.post("/evaluate", response_model=ScoringResponse)
def evaluate_debate_score(
    req: ScoringRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = ScoringService(db)
    return service.evaluate_performance(
        session_id=req.session_id,
        user_id=current_user.id,
        argument_quality=req.argument_quality,
        evidence_usage=req.evidence_usage,
        logical_consistency=req.logical_consistency,
        rebuttal_effectiveness=req.rebuttal_effectiveness,
        communication_skills=req.communication_skills,
        raw_speech_text=req.raw_speech_text,
    )
