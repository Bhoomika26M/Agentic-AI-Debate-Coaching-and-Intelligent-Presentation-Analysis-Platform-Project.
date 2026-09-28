from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import os
import json
import shutil
from backend.app.database.session import get_db
from backend.app.models.entities import User, PresentationSession, PresentationMetric, Transcript
from backend.app.auth.dependencies import get_current_active_user
from backend.app.ai.speech_analyzer import speech_analyzer
from backend.app.config.settings import settings

router = APIRouter(prefix="/presentation", tags=["Presentation Analysis"])

@router.post("/upload")
async def upload_presentation(
    file: UploadFile = File(...),
    title: str = Form("Practice Speech"),
    duration_seconds: float = Form(120.0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"user_{current_user.id}_{int(duration_seconds)}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Simulated speech transcription text (or transcribe if Whisper available)
    transcript_sample = (
        "Good morning everyone. Um, today I want to present our research on scalable renewable energy storage. "
        "Basically, current lithium-ion battery density, like, limits grid stability during high peak demand. "
        "Actually, if we transition to flow battery chemistries, you know, we can scale duration from four hours "
        "to over twenty-four hours at forty percent lower operational cost. So, this transforms clean energy economics."
    )

    # Analyze
    analysis = await speech_analyzer.analyze_speech(
        text=transcript_sample,
        duration_seconds=duration_seconds,
        audio_filename=safe_filename
    )

    # Save session
    session = PresentationSession(
        user_id=current_user.id,
        title=title,
        media_filename=safe_filename,
        media_type="audio",
        duration_seconds=duration_seconds,
        status="completed"
    )
    db.add(session)
    db.flush()

    db.add(Transcript(
        presentation_id=session.id,
        text=transcript_sample,
        timestamps_json="[]"
    ))

    metric = PresentationMetric(
        session_id=session.id,
        words_per_minute=analysis["words_per_minute"],
        pace_classification=analysis["pace_classification"],
        filler_words_count=analysis["filler_words_count"],
        filler_words_breakdown=json.dumps(analysis["filler_words_breakdown"]),
        confidence_score=analysis["confidence_score"],
        clarity_score=analysis["clarity_score"],
        engagement_score=analysis["engagement_score"],
        speaking_score=analysis["speaking_score"],
        overall_score=analysis["overall_score"],
        pace_timeline=json.dumps(analysis["pace_timeline"]),
        confidence_explanation=analysis["confidence_explanation"],
        strengths=analysis["strengths"],
        weaknesses=analysis["weaknesses"],
        recommended_improvements=analysis["recommended_improvements"]
    )
    db.add(metric)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "title": session.title,
        "metrics": analysis,
        "transcript": transcript_sample
    }

@router.post("/analyze")
async def analyze_presentation_text(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    title = payload.get("title", "Speech Analysis")
    text = payload.get("transcript_text", "")
    duration_seconds = float(payload.get("duration_seconds", 120.0))

    analysis = await speech_analyzer.analyze_speech(text, duration_seconds)

    session = PresentationSession(
        user_id=current_user.id,
        title=title,
        media_filename=None,
        media_type="text_input",
        duration_seconds=duration_seconds,
        status="completed"
    )
    db.add(session)
    db.flush()

    db.add(Transcript(presentation_id=session.id, text=text, timestamps_json="[]"))

    metric = PresentationMetric(
        session_id=session.id,
        words_per_minute=analysis["words_per_minute"],
        pace_classification=analysis["pace_classification"],
        filler_words_count=analysis["filler_words_count"],
        filler_words_breakdown=json.dumps(analysis["filler_words_breakdown"]),
        confidence_score=analysis["confidence_score"],
        clarity_score=analysis["clarity_score"],
        engagement_score=analysis["engagement_score"],
        speaking_score=analysis["speaking_score"],
        overall_score=analysis["overall_score"],
        pace_timeline=json.dumps(analysis["pace_timeline"]),
        confidence_explanation=analysis["confidence_explanation"],
        strengths=analysis["strengths"],
        weaknesses=analysis["weaknesses"],
        recommended_improvements=analysis["recommended_improvements"]
    )
    db.add(metric)
    db.commit()

    return {
        "id": session.id,
        "title": title,
        "metrics": analysis,
        "transcript": text
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_presentations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(PresentationSession).filter(PresentationSession.user_id == current_user.id).order_by(PresentationSession.created_at.desc()).all()
    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "title": s.title,
            "media_type": s.media_type,
            "duration_seconds": s.duration_seconds,
            "overall_score": s.metrics.overall_score if s.metrics else None,
            "pace_classification": s.metrics.pace_classification if s.metrics else None,
            "words_per_minute": s.metrics.words_per_minute if s.metrics else None,
            "filler_words_count": s.metrics.filler_words_count if s.metrics else None,
            "created_at": s.created_at
        })
    return results

@router.get("/{id}", response_model=Dict[str, Any])
def get_presentation(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    session = db.query(PresentationSession).filter(PresentationSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Presentation session not found")
    if session.user_id != current_user.id and current_user.role not in ["coach", "educator", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    m = session.metrics
    metrics_data = None
    if m:
        metrics_data = {
            "words_per_minute": m.words_per_minute,
            "pace_classification": m.pace_classification,
            "filler_words_count": m.filler_words_count,
            "filler_words_breakdown": json.loads(m.filler_words_breakdown) if m.filler_words_breakdown else {},
            "confidence_score": m.confidence_score,
            "clarity_score": m.clarity_score,
            "engagement_score": m.engagement_score,
            "speaking_score": m.speaking_score,
            "overall_score": m.overall_score,
            "pace_timeline": json.loads(m.pace_timeline) if m.pace_timeline else [],
            "confidence_explanation": m.confidence_explanation,
            "strengths": m.strengths,
            "weaknesses": m.weaknesses,
            "recommended_improvements": m.recommended_improvements
        }

    return {
        "id": session.id,
        "title": session.title,
        "media_type": session.media_type,
        "duration_seconds": session.duration_seconds,
        "status": session.status,
        "transcript": session.transcript.text if session.transcript else "",
        "metrics": metrics_data,
        "created_at": session.created_at
    }
