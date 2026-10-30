from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.argument import FallacyDetection
from app.schemas.argument import FallacyDetectionRequest, FallacyDetectionOut
from app.services.ai_service import ai_service

router = APIRouter(prefix="/fallacies", tags=["Fallacy Detection"])

@router.post("/detect", response_model=FallacyDetectionOut)
def detect_fallacies(
    req: FallacyDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    result = ai_service.detect_fallacies(req.text)

    record = FallacyDetection(
        user_id=current_user.id,
        input_text=req.text,
        has_fallacies=result.get("has_fallacies", False),
        fallacies=result.get("fallacies", []),
        credibility_impact=result.get("credibility_impact", "None"),
        summary=result.get("summary", "")
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/history", response_model=List[FallacyDetectionOut])
def get_fallacy_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FallacyDetection).filter(
        FallacyDetection.user_id == current_user.id
    ).order_by(FallacyDetection.created_at.desc()).limit(20).all()
