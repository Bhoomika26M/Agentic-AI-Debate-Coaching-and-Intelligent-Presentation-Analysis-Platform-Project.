from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.debate_session import DebateSession
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisReportResponse,
    FallacyDefinition,
)
from app.services.argument_analysis import analysis_engine, SUPPORTED_FALLACIES

router = APIRouter(prefix="/analysis", tags=["Argument Analysis & Fallacy Detection"])


@router.get("/fallacies", response_model=list[FallacyDefinition])
async def list_supported_fallacies():
    """Retrieve catalog of all 8 supported logical fallacies with definitions and fixes."""
    return SUPPORTED_FALLACIES


@router.post("/evaluate", response_model=AnalysisReportResponse)
async def evaluate_text(
    payload: AnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Directly evaluate an argument snippet or debate transcript.
    Performs argument extraction, 8-fallacy detection, criteria scoring,
    and weighted overall performance calculation.
    """
    report = analysis_engine.analyze(
        text=payload.text,
        topic=payload.topic,
        position=payload.position,
        context=payload.context,
    )
    return report


@router.post("/session/{session_id}", response_model=AnalysisReportResponse)
async def evaluate_session_transcript(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run the AI Argument Analysis and Fallacy Detection Engine on an existing session transcript.
    Updates the session score, feedback summary, and rubric criteria automatically.
    """
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.user_id != current_user.id and current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Access denied.")

    if not session.transcript or len(session.transcript.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Session transcript is empty or too short. Please save a speech transcript first.",
        )

    # Perform analysis
    report = analysis_engine.analyze(
        text=session.transcript,
        topic=session.topic,
        position=session.position,
        context=session.format,
    )

    # Persist back to session
    session.score = report.overall_score
    session.feedback_summary = report.executive_summary
    session.evaluation_criteria = {
        "argument_quality": report.weighted_scores.argument_quality,
        "evidence_usage": report.weighted_scores.evidence_usage,
        "logical_consistency": report.weighted_scores.logical_consistency,
        "rebuttal_effectiveness": report.weighted_scores.rebuttal_effectiveness,
        "communication_skills": report.weighted_scores.communication_skills,
        "clarity": report.evaluation_criteria.clarity,
        "relevance": report.evaluation_criteria.relevance,
        "fallacies_count": len(report.fallacies),
    }
    session.key_arguments = report.arguments.premises
    if session.status != "completed":
        session.status = "completed"

    # Update student's avg_score
    student_res = await db.execute(select(User).where(User.id == session.user_id))
    student = student_res.scalar_one_or_none()
    if student:
        completed_sessions = await db.execute(
            select(DebateSession).where(
                DebateSession.user_id == student.id,
                DebateSession.score.isnot(None),
            )
        )
        scores = [s.score for s in completed_sessions.scalars().all()]
        if scores:
            student.avg_score = round(sum(scores) / len(scores), 1)

    await db.flush()
    return report


@router.get("/session/{session_id}/report", response_model=AnalysisReportResponse)
async def get_session_analysis_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed Argument Analysis & Fallacy Detection report for a session.
    """
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.user_id != current_user.id and current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Access denied.")

    if not session.transcript:
        raise HTTPException(status_code=400, detail="No transcript recorded for this session.")

    return analysis_engine.analyze(
        text=session.transcript,
        topic=session.topic,
        position=session.position,
        context=session.format,
    )
