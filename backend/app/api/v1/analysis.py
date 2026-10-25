from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, DebateSession
from app.api.deps import get_current_user
from app.services.argument_engine import argument_engine
from app.services.fallacy_engine import fallacy_engine
from app.services.scoring_engine import scoring_engine, DebateReportOutput
from app.schemas.analysis import (
    TextAnalysisRequest,
    ArgumentAnalysisResponse,
    FallacyDetectionResponse,
    SessionEvaluationRequest,
)

router = APIRouter()

@router.post("/arguments", response_model=ArgumentAnalysisResponse)
async def analyze_arguments(
    request: TextAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Milestone 2 AI Engine:
    Extract claims, premises/warrants, and empirical evidence; score 5 forensic dimensions.
    """
    if not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Speech text cannot be empty.")
    
    components = argument_engine.analyze_text(request.text, request.motion_context)
    return ArgumentAnalysisResponse(
        arguments=components,
        total_arguments=len(components)
    )

@router.post("/fallacies", response_model=FallacyDetectionResponse)
async def detect_fallacies(
    request: TextAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Milestone 2 AI Engine:
    Detect 8 debate fallacies, calculate credibility penalty, and generate correction advice.
    """
    if not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Speech text cannot be empty.")
    
    fallacies = fallacy_engine.detect_fallacies(request.text)
    total_penalty = sum(f.credibility_penalty for f in fallacies)

    return FallacyDetectionResponse(
        fallacies=fallacies,
        total_fallacies=len(fallacies),
        credibility_penalty_total=total_penalty
    )

@router.post("/session/{session_id}/evaluate", response_model=DebateReportOutput)
async def evaluate_session_speech(
    session_id: str,
    payload: SessionEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Milestone 2 AI Engine:
    Generate comprehensive feedback report with weighted scoring model for a debate session speech.
    """
    session = await db.get(DebateSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate session not found.")

    report = scoring_engine.evaluate_debate_text(
        transcript_text=payload.transcript_text,
        motion_context=payload.motion_context,
        session_id=session_id
    )
    return report
