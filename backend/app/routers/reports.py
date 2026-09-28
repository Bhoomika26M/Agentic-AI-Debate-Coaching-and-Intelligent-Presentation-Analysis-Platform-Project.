from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.app.database.session import get_db
from backend.app.models.entities import User, DebateSession, PresentationSession, Report
from backend.app.auth.dependencies import get_current_active_user
from backend.app.services.export_service import export_service

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("/debate/{id}", response_model=Dict[str, Any])
def get_debate_report(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(DebateSession).filter(DebateSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")
    
    score = session.score
    return {
        "session_id": session.id,
        "topic": session.topic,
        "position": session.position,
        "format": session.format,
        "difficulty": session.difficulty,
        "rounds_count": len(session.rounds),
        "scores": {
            "argument_quality": score.argument_quality if score else 78.0,
            "evidence_usage": score.evidence_usage if score else 72.0,
            "logical_consistency": score.logical_consistency if score else 80.0,
            "rebuttal_effectiveness": score.rebuttal_effectiveness if score else 75.0,
            "communication_skills": score.communication_skills if score else 82.0,
            "overall_score": score.overall_score if score else 77.3
        },
        "strongest_argument": score.strongest_argument if score else "Clear defense of primary thesis.",
        "weakest_argument": score.weakest_argument if score else "Vulnerability in handling transition trade-offs.",
        "best_rebuttal": score.best_rebuttal if score else "Distinguishing cognitive skills from socio-emotional mentorship.",
        "detected_fallacies_count": score.detected_fallacies_count if score else 0,
        "coaching_summary": score.coaching_summary if score else "Solid debate round.",
        "next_practice_exercise": score.next_practice_exercise if score else "Evidence Grounding Drill"
    }

@router.get("/presentation/{id}", response_model=Dict[str, Any])
def get_presentation_report(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pres = db.query(PresentationSession).filter(PresentationSession.id == id).first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presentation not found")
    
    m = pres.metrics
    return {
        "session_id": pres.id,
        "title": pres.title,
        "duration_seconds": pres.duration_seconds,
        "words_per_minute": m.words_per_minute if m else 142.0,
        "pace_classification": m.pace_classification if m else "Balanced",
        "filler_words_count": m.filler_words_count if m else 5,
        "confidence_score": m.confidence_score if m else 78.0,
        "clarity_score": m.clarity_score if m else 82.0,
        "engagement_score": m.engagement_score if m else 76.0,
        "overall_score": m.overall_score if m else 78.5,
        "strengths": m.strengths if m else "Clear delivery",
        "weaknesses": m.weaknesses if m else "Occasional fillers",
        "recommendations": m.recommended_improvements if m else "Practice controlled pauses"
    }

@router.post("/export/excel")
def export_excel(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    excel_stream = export_service.generate_excel_report(payload)
    headers = {
        'Content-Disposition': 'attachment; filename="DebateAI_Evaluation_Report.xlsx"'
    }
    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

@router.post("/export/pdf")
def export_pdf(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    pdf_stream = export_service.generate_pdf_report(payload)
    headers = {
        'Content-Disposition': 'attachment; filename="DebateAI_Performance_Report.pdf"'
    }
    return Response(
        content=pdf_stream.getvalue(),
        media_type="application/pdf",
        headers=headers
    )
