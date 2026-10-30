from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.argument_analysis import ArgumentAnalysis
from app.models.user import User
from app.schemas.argument_analysis import ArgumentAnalysisInput, ArgumentAnalysisResponse
from app.schemas.counterargument import CounterargumentRequest, CounterargumentResponse
from app.services.argument_analysis_service import create_or_update_analysis_record, validate_argument_input
from app.services.auth_service import get_current_user
from app.services.counterargument_service import generate_counterarguments


router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/arguments", response_model=ArgumentAnalysisResponse, status_code=status.HTTP_201_CREATED)
def submit_argument_analysis(payload: ArgumentAnalysisInput, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    try:
        validated = validate_argument_input(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    analysis = create_or_update_analysis_record(
        database,
        user_id=current_user.id,
        topic=validated.topic,
        argument_text=validated.argument_text,
        position=validated.position,
        debate_session_id=validated.debate_session_id,
    )
    try:
        from app.services.skill_service import sync_user_skills
        sync_user_skills(database, current_user.id)
    except Exception:
        pass
    return analysis


@router.post("/counterarguments", response_model=CounterargumentResponse)
def generate_counterarguments_endpoint(
    payload: CounterargumentRequest,
    current_user: User = Depends(get_current_user),
):
    return generate_counterarguments(payload)


@router.get("/arguments", response_model=list[ArgumentAnalysisResponse])
def list_argument_analyses(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    return (
        database.query(ArgumentAnalysis)
        .filter(ArgumentAnalysis.user_id == current_user.id)
        .order_by(ArgumentAnalysis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/arguments/{analysis_id}", response_model=ArgumentAnalysisResponse)
def get_argument_analysis(analysis_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    analysis = database.get(ArgumentAnalysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not allowed to view this analysis")
    return analysis


@router.post("/arguments/{analysis_id}/reanalyze", response_model=ArgumentAnalysisResponse)
def reanalyze_argument_analysis(analysis_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    analysis = database.get(ArgumentAnalysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not allowed to reanalyze this analysis")

    refreshed = create_or_update_analysis_record(
        database,
        user_id=current_user.id,
        topic=analysis.topic,
        argument_text=analysis.argument_text,
        position=analysis.position,
        debate_session_id=analysis.debate_session_id,
        analysis_id=analysis.id,
    )
    return refreshed
