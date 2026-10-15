from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.analysis import PresentationSession, PresentationAnalysis
from app.schemas.analysis import PresentationTextRequest, PresentationAnalysisOut, PresentationAudioResponse
from app.core.deps import get_current_user
from app.services import gemini_service
from app.utils.presentation_metrics import count_words, count_fillers, words_per_minute

router = APIRouter(prefix="/api/presentations", tags=["presentations"])

def _build_analysis_record(session_id: str, transcript: str, duration: float | None, ai: dict, db: Session) -> PresentationAnalysis:
    wc = count_words(transcript)
    filler = count_fillers(transcript)
    wpm = words_per_minute(wc, duration)
    record = PresentationAnalysis(
        session_id=session_id, word_count=wc, duration_seconds=duration,
        words_per_minute=wpm, filler_word_count=filler, analysis_json=ai,
    )
    db.add(record); db.flush()
    return record

def _to_out(rec: PresentationAnalysis, ai: dict) -> PresentationAnalysisOut:
    return PresentationAnalysisOut(
        id=rec.id, session_id=rec.session_id,
        word_count=rec.word_count, duration_seconds=rec.duration_seconds,
        words_per_minute=rec.words_per_minute, filler_word_count=rec.filler_word_count,
        clarity_score=ai.get("clarity_score", 0),
        organization_score=ai.get("organization_score", 0),
        engagement_score=ai.get("engagement_score", 0),
        strengths=ai.get("strengths", []),
        weaknesses=ai.get("weaknesses", []),
        improvement_suggestions=ai.get("improvement_suggestions", []),
        opening_suggestion=ai.get("opening_suggestion", ""),
        conclusion_suggestion=ai.get("conclusion_suggestion", ""),
    )

@router.post("/text", response_model=PresentationAnalysisOut)
def analyze_text(payload: PresentationTextRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ai = gemini_service.analyze_presentation(payload.transcript, payload.duration_seconds)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))
    session = PresentationSession(user_id=user.id, title=payload.title, input_type="text", transcript=payload.transcript)
    db.add(session); db.flush()
    rec = _build_analysis_record(session.id, payload.transcript, payload.duration_seconds, ai, db)
    db.commit(); db.refresh(rec)
    return _to_out(rec, ai)

MAX_AUDIO_BYTES = 20 * 1024 * 1024  # 20MB
ALLOWED_AUDIO = {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm", "audio/ogg"}

@router.post("/audio", response_model=PresentationAudioResponse)
async def upload_audio(
    title: str = Form(...),
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if audio.content_type not in ALLOWED_AUDIO:
        raise HTTPException(status_code=400, detail=f"Unsupported audio type: {audio.content_type}")
    data = await audio.read()
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large (max 20MB)")
    try:
        transcript = gemini_service.transcribe_audio(data, audio.content_type)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {str(e)}")
    session = PresentationSession(user_id=user.id, title=title, input_type="audio", transcript=transcript)
    db.add(session); db.commit(); db.refresh(session)
    return PresentationAudioResponse(
        session_id=session.id, transcript=transcript,
        message="Audio transcribed. Submit transcript for analysis next.",
    )

@router.post("/{session_id}/analyze", response_model=PresentationAnalysisOut)
def analyze_existing(session_id: str, duration_seconds: float | None = None,
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(PresentationSession).filter_by(id=session_id, user_id=user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Presentation not found")
    try:
        ai = gemini_service.analyze_presentation(session.transcript, duration_seconds)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))
    rec = _build_analysis_record(session.id, session.transcript, duration_seconds, ai, db)
    db.commit(); db.refresh(rec)
    return _to_out(rec, ai)

@router.get("")
def list_presentations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(PresentationSession).filter_by(user_id=user.id).order_by(PresentationSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title, "input_type": s.input_type,
             "created_at": s.created_at.isoformat()} for s in rows]