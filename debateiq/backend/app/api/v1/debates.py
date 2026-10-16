from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.services.debate_service import DebateService
from app.models.user import User
from app.schemas.debate import (
    TopicCreate,
    TopicAISuggestRequest,
    TopicResponse,
    FormatInfoResponse,
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    TurnCreate,
    TurnResponse,
)

router = APIRouter(prefix="/debates", tags=["Debate Management"])

@router.get("/formats", response_model=List[FormatInfoResponse])
def list_formats(db: Session = Depends(get_db)):
    service = DebateService(db)
    return service.get_formats()

@router.get("/topics", response_model=List[TopicResponse])
def list_topics(category: Optional[str] = None, db: Session = Depends(get_db)):
    service = DebateService(db)
    return service.list_topics(category=category)

@router.post("/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    req: TopicCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DebateService(db)
    return service.create_topic(
        user_id=current_user.id,
        title=req.title,
        motion_text=req.motion_text,
        category=req.category,
        difficulty=req.difficulty,
    )

@router.post("/topics/ai-suggest", response_model=List[Dict[str, Any]])
def suggest_topics(req: TopicAISuggestRequest, db: Session = Depends(get_db)):
    service = DebateService(db)
    return service.suggest_topics(category=req.category or "All", difficulty=req.difficulty or "Intermediate", count=req.count)

@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DebateService(db)
    return service.list_sessions(user_id=current_user.id, status=status)

@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    req: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DebateService(db)
    return service.create_session(
        user_id=current_user.id,
        topic_id=req.topic_id,
        format_name=req.format,
        ai_persona=req.ai_persona or "Socratic Questioner",
        ai_difficulty=req.ai_opponent_difficulty or "Intermediate",
        user_position=req.user_position or "proposition",
        scheduled_at=req.scheduled_at,
    )

@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    service = DebateService(db)
    return service.get_session(session_id)

@router.patch("/sessions/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: str,
    req: SessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DebateService(db)
    updated = service.repo.update_session(session_id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return updated

@router.post("/sessions/{session_id}/turns", response_model=Dict[str, Any])
def submit_turn(
    session_id: str,
    req: TurnCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = DebateService(db)
    result = service.submit_user_turn(
        session_id=session_id,
        user_id=current_user.id,
        speech_text=req.speech_text,
        round_number=req.round_number or 1,
        duration_seconds=req.duration_seconds or 60,
    )
    user_turn_resp = TurnResponse.model_validate(result["user_turn"])
    ai_turn_resp = TurnResponse.model_validate(result["ai_turn"]) if result["ai_turn"] else None
    return {
        "user_turn": user_turn_resp,
        "ai_turn": ai_turn_resp,
    }
