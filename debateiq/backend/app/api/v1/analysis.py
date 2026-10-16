from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.services.analysis_service import AnalysisService
from app.models.user import User
from app.schemas.analysis import (
    ArgumentAnalysisRequest,
    ArgumentAnalysisResponse,
    FallacyDetectionRequest,
    FallacyDetectionResponse,
    FallacyCatalogItem,
    RebuttalGenerationRequest,
    RebuttalMatrixResponse,
    FeedbackReportResponse,
)

router = APIRouter(prefix="/analysis", tags=["Argument & Fallacy Analysis"])

@router.post("/arguments", response_model=ArgumentAnalysisResponse)
def analyze_argument(req: ArgumentAnalysisRequest, db: Session = Depends(get_db)):
    service = AnalysisService(db)
    return service.analyze_argument(text=req.text, context=req.context or "Debate Speech")

@router.post("/fallacies", response_model=FallacyDetectionResponse)
def detect_fallacies(req: FallacyDetectionRequest, db: Session = Depends(get_db)):
    service = AnalysisService(db)
    return service.detect_fallacies(text=req.text, context=req.context or "Debate Speech")

@router.get("/fallacy-catalog", response_model=List[FallacyCatalogItem])
def get_fallacy_catalog(db: Session = Depends(get_db)):
    service = AnalysisService(db)
    return service.get_fallacy_catalog()

@router.post("/rebuttals", response_model=RebuttalMatrixResponse)
def generate_rebuttals(req: RebuttalGenerationRequest, db: Session = Depends(get_db)):
    service = AnalysisService(db)
    return service.generate_rebuttals(
        target_claim=req.target_claim,
        motion_context=req.motion_context or "Debate Resolution",
        target_position=req.target_position or "opposition",
    )

@router.get("/reports", response_model=List[FeedbackReportResponse])
def list_reports(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = AnalysisService(db)
    return service.list_reports(user_id=current_user.id)

@router.get("/reports/{report_id}", response_model=FeedbackReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    service = AnalysisService(db)
    report = service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return report
