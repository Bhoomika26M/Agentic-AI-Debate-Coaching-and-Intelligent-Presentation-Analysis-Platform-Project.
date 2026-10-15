from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.debate import DebateSession, DebateMessage
from app.models.analysis import PerformanceEvaluation
from app.schemas.debate import DebateCreate, DebateOut, DebateTurnRequest
from app.core.deps import get_current_user
from app.services import gemini_service
from app.utils.scoring import compute_overall

router = APIRouter(prefix="/api/debates", tags=["debates"])

def _own_session(session_id: str, user: User, db: Session) -> DebateSession:
    s = db.query(DebateSession).filter(DebateSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Debate session not found")
    if s.user_id != user.id and user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Not authorized for this session")
    return s

@router.post("", response_model=DebateOut)
def create_debate(payload: DebateCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = DebateSession(
        user_id=user.id, topic=payload.topic, format=payload.format,
        position=payload.position, difficulty=payload.difficulty,
    )
    db.add(session)
    db.flush()
    db.add(DebateMessage(session_id=session.id, sender="user",
                         content=payload.opening_argument, turn_number=1))
    # AI opening response
    try:
        ai_reply = gemini_service.ai_opponent_response(
            topic=session.topic,
            ai_position="AGAINST" if session.position == "FOR" else "FOR",
            user_position=session.position,
            history=[{"sender": "user", "content": payload.opening_argument}],
            user_message=payload.opening_argument,
        )
    except gemini_service.GeminiError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))
    db.add(DebateMessage(session_id=session.id, sender="ai", content=ai_reply, turn_number=2))
    db.commit()
    db.refresh(session)
    return DebateOut.model_validate(session)

@router.get("", response_model=list[DebateOut])
def list_debates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(DebateSession)
    if user.role == "learner":
        q = q.filter(DebateSession.user_id == user.id)
    return [DebateOut.model_validate(s) for s in q.order_by(DebateSession.created_at.desc()).all()]

@router.get("/{session_id}", response_model=DebateOut)
def get_debate(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DebateOut.model_validate(_own_session(session_id, user, db))

@router.post("/{session_id}/turn", response_model=DebateOut)
def add_turn(session_id: str, payload: DebateTurnRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _own_session(session_id, user, db)
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Debate already completed")
    next_turn = len(session.messages) + 1
    db.add(DebateMessage(session_id=session.id, sender="user", content=payload.content, turn_number=next_turn))
    db.flush()
    history = [{"sender": m.sender, "content": m.content} for m in session.messages]
    try:
        ai_reply = gemini_service.ai_opponent_response(
            topic=session.topic,
            ai_position="AGAINST" if session.position == "FOR" else "FOR",
            user_position=session.position,
            history=history,
            user_message=payload.content,
        )
    except gemini_service.GeminiError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))
    db.add(DebateMessage(session_id=session.id, sender="ai", content=ai_reply, turn_number=next_turn + 1))
    db.commit()
    db.refresh(session)
    return DebateOut.model_validate(session)

@router.post("/{session_id}/end")
def end_debate(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ends debate, generates final scoring via argument analysis + deterministic weights."""
    session = _own_session(session_id, user, db)
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Already completed")
    user_text = "\n\n".join(m.content for m in session.messages if m.sender == "user")
    try:
        analysis = gemini_service.analyze_argument(user_text, session.topic)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))

    components = {
        "argument_quality": analysis.get("persuasiveness_score", 50),
        "evidence_usage": analysis.get("relevance_score", 50),
        "logical_consistency": analysis.get("logical_consistency_score", 50),
        "rebuttal_effectiveness": analysis.get("persuasiveness_score", 50),
        "communication_skills": analysis.get("clarity_score", 50),
    }
    overall = compute_overall(components)
    ev = PerformanceEvaluation(
        user_id=user.id, session_id=session.id,
        argument_quality=components["argument_quality"],
        evidence_usage=components["evidence_usage"],
        logical_consistency=components["logical_consistency"],
        rebuttal_effectiveness=components["rebuttal_effectiveness"],
        communication_skills=components["communication_skills"],
        overall_score=overall,
        strengths=analysis.get("strengths", []),
        weaknesses=analysis.get("weaknesses", []),
    )
    db.add(ev)
    session.status = "completed"
    db.commit()
    return {"overall_score": overall, "components": components,
            "strengths": ev.strengths, "weaknesses": ev.weaknesses}

@router.delete("/{session_id}")
def delete_debate(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _own_session(session_id, user, db)
    if session.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(session)
    db.commit()
    return {"message": "Deleted"}