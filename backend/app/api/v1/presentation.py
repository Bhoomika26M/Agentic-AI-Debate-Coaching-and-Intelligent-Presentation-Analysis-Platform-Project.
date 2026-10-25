from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import User, DebateSession
from app.services.presentation_engine import presentation_engine, PresentationMetrics
from app.services.report_engine import report_engine, FullDebateForensicsReport
from app.schemas.presentation import (
    PresentationAnalysisRequest,
    FullReportRequest
)

router = APIRouter()

@router.post("/analyze", response_model=PresentationMetrics)
async def analyze_speech_presentation(
    request: PresentationAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Milestone 4 Engine:
    Calculate Speech Pace (WPM), Filler Word Density, Confidence, Clarity, and Audience Engagement.
    """
    metrics = presentation_engine.analyze_presentation(
        text=request.speech_text,
        audio_duration_sec=request.speech_duration_sec
    )
    return metrics

@router.post("/session/{session_id}/report", response_model=FullDebateForensicsReport)
async def generate_session_forensics_report(
    session_id: str,
    payload: FullReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Milestone 4 Engine:
    Generate comprehensive Full Debate Forensics Report synthesizing
    argument claims, detected fallacies, performance scores, and presentation pacing.
    """
    report = report_engine.generate_full_report(
        session_id=session_id,
        motion=payload.motion,
        transcript_text=payload.transcript_text,
        speech_duration_sec=payload.speech_duration_sec
    )
    return report
