from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.argument import ArgumentAnalysis
from app.schemas.argument import ArgumentAnalysisRequest, ArgumentAnalysisOut
from app.services.ai_service import ai_service

router = APIRouter(prefix="/arguments", tags=["Argument Analysis"])

@router.post("/analyze", response_model=ArgumentAnalysisOut)
def analyze_argument(
    req: ArgumentAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.argument.strip():
        raise HTTPException(status_code=400, detail="Argument text cannot be empty.")

    analysis = ai_service.analyze_argument(req.argument, req.topic)

    record = ArgumentAnalysis(
        user_id=current_user.id,
        topic=req.topic,
        input_argument=req.argument,
        main_claim=analysis["main_claim"],
        supporting_arguments=analysis.get("supporting_arguments", []),
        evidence_assessment=analysis.get("evidence_assessment", ""),
        strengths=analysis.get("strengths", []),
        weaknesses=analysis.get("weaknesses", []),
        missing_evidence=analysis.get("missing_evidence", ""),
        suggestions=analysis.get("suggestions", []),
        clarity_score=analysis.get("clarity_score", 70.0),
        relevance_score=analysis.get("relevance_score", 75.0),
        evidence_strength_score=analysis.get("evidence_strength_score", 65.0),
        logical_consistency_score=analysis.get("logical_consistency_score", 70.0),
        persuasiveness_score=analysis.get("persuasiveness_score", 70.0),
        overall_score=analysis.get("overall_score", 70.0)
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/history", response_model=List[ArgumentAnalysisOut])
def get_argument_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ArgumentAnalysis).filter(
        ArgumentAnalysis.user_id == current_user.id
    ).order_by(ArgumentAnalysis.created_at.desc()).limit(20).all()
