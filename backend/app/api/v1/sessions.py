import os
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.models import User, DebateSession, DebateTopic, SessionParticipant, SessionRecording
from app.models.enums import SessionStatus, DebateFormat, ParticipantPosition, RecordingType
from app.schemas.topic_session import (
    SessionCreate, SessionUpdate, SessionStatusUpdate, SessionResponse,
    ParticipantAssign, ParticipantResponse, RecordingResponse
)
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[SessionStatus] = None,
    format: Optional[DebateFormat] = None,
    mine_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List debate sessions with optional status/format filters and 'mine only' toggle."""
    query = (
        select(DebateSession)
        .options(
            selectinload(DebateSession.topic),
            selectinload(DebateSession.participants).selectinload(SessionParticipant.user),
            selectinload(DebateSession.recordings)
        )
        .order_by(DebateSession.scheduled_at.desc())
        .offset(skip)
        .limit(limit)
    )

    if status:
        query = query.where(DebateSession.status == status)
    if format:
        query = query.where(DebateSession.format == format)
    if mine_only:
        query = query.where(
            (DebateSession.created_by == current_user.id) |
            (DebateSession.coach_id == current_user.id) |
            (DebateSession.participants.any(SessionParticipant.user_id == current_user.id))
        )

    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Schedule a new debate session with topic and optional participant assignments."""
    topic = await db.get(DebateTopic, session_in.topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate topic not found")

    session = DebateSession(
        topic_id=session_in.topic_id,
        format=session_in.format,
        scheduled_at=session_in.scheduled_at,
        duration_min=session_in.duration_min,
        created_by=current_user.id,
        coach_id=session_in.coach_id
    )
    db.add(session)
    await db.flush()

    # Add participants if provided
    if session_in.participants:
        for p in session_in.participants:
            participant = SessionParticipant(
                session_id=session.id,
                user_id=p.user_id,
                position=p.position,
                speaker_order=p.speaker_order
            )
            db.add(participant)
    else:
        # Default: creator joins as proposition speaker 1
        db.add(SessionParticipant(
            session_id=session.id,
            user_id=current_user.id,
            position=ParticipantPosition.PROPOSITION,
            speaker_order=1
        ))

    await db.commit()

    # Reload with relationships
    stmt = (
        select(DebateSession)
        .options(
            selectinload(DebateSession.topic),
            selectinload(DebateSession.participants).selectinload(SessionParticipant.user),
            selectinload(DebateSession.recordings)
        )
        .where(DebateSession.id == session.id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full details of a debate session."""
    stmt = (
        select(DebateSession)
        .options(
            selectinload(DebateSession.topic),
            selectinload(DebateSession.participants).selectinload(SessionParticipant.user),
            selectinload(DebateSession.recordings)
        )
        .where(DebateSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session

@router.patch("/{session_id}/status", response_model=SessionResponse)
async def update_session_status(
    session_id: str,
    status_in: SessionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start, complete, or cancel a debate session."""
    session = await db.get(DebateSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session.status = status_in.status
    await db.commit()

    stmt = (
        select(DebateSession)
        .options(
            selectinload(DebateSession.topic),
            selectinload(DebateSession.participants).selectinload(SessionParticipant.user),
            selectinload(DebateSession.recordings)
        )
        .where(DebateSession.id == session.id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()

@router.post("/{session_id}/join", response_model=ParticipantResponse)
async def join_session(
    session_id: str,
    position: ParticipantPosition = ParticipantPosition.OPPOSITION,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join an existing debate session as Proposition, Opposition, or Neutral."""
    session = await db.get(DebateSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    existing = await db.get(SessionParticipant, (session_id, current_user.id))
    if existing:
        existing.position = position
        await db.commit()
        await db.refresh(existing)
        return existing

    # Find highest speaker order in that position
    part = SessionParticipant(
        session_id=session_id,
        user_id=current_user.id,
        position=position,
        speaker_order=1
    )
    db.add(part)
    await db.commit()
    await db.refresh(part)
    return part

@router.post("/{session_id}/recordings", response_model=RecordingResponse)
async def upload_recording(
    session_id: str,
    file: UploadFile = File(...),
    type: RecordingType = RecordingType.AUDIO,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload audio or video recording for a debate session and save its metadata."""
    session = await db.get(DebateSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".webm"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file locally
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    recording = SessionRecording(
        session_id=session_id,
        file_url=f"/uploads/{unique_filename}",
        type=type
    )
    db.add(recording)
    await db.commit()
    await db.refresh(recording)
    return recording