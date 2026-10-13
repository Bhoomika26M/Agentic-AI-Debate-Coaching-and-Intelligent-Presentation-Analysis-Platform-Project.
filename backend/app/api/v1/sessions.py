from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.deps import get_db, get_current_user, require_roles
from app.models.user import User
from app.models.debate import (
    DebateSession, SessionParticipant, PresentationHistory,
    SessionStatus, DebateFormat, ParticipantPosition,
)
from app.schemas.debate import (
    SessionCreate, SessionUpdate, SessionRead,
    JoinSessionRequest, ParticipantRead,
    PresentationCreate, PresentationRead,
)

router = APIRouter(prefix="/sessions", tags=["Debate Sessions"])


# ─── Session CRUD ─────────────────────────────────────────────────────────────

@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create and schedule a new debate session. Creator is auto-enrolled."""
    session = DebateSession(
        topic_id=body.topic_id,
        format=body.format,
        scheduled_at=body.scheduled_at,
        created_by=current_user.id,
        status=SessionStatus.scheduled,
    )
    db.add(session)
    await db.flush()  # get session.id before adding participant

    participant = SessionParticipant(
        session_id=session.id,
        user_id=current_user.id,
        position=body.position,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("", response_model=list[SessionRead])
async def list_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    format_filter: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List sessions the current user is a participant in.
    Administrators see all sessions.
    Optional filters: status, format.
    """
    # Build subquery: sessions this user is enrolled in
    participant_subq = select(SessionParticipant.session_id).where(
        SessionParticipant.user_id == current_user.id
    )

    conditions = []
    if current_user.role.value != "administrator":
        conditions.append(DebateSession.id.in_(participant_subq))

    if status_filter:
        try:
            conditions.append(DebateSession.status == SessionStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    if format_filter:
        try:
            conditions.append(DebateSession.format == DebateFormat(format_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid format: {format_filter}")

    query = select(DebateSession)
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionRead)
async def update_session(
    session_id: UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update session metadata. Only creator or admin."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status not in (SessionStatus.scheduled,):
        raise HTTPException(status_code=400, detail="Can only update scheduled sessions")

    is_creator = session.created_by == current_user.id
    is_admin = current_user.role.value == "administrator"
    if not (is_creator or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(session, field, value)
    session.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(session)
    return session


# ─── Session State Transitions ────────────────────────────────────────────────

@router.post("/{session_id}/start", response_model=SessionRead)
async def start_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move session from scheduled → active."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.scheduled:
        raise HTTPException(status_code=400, detail="Session is not in scheduled state")

    is_creator = session.created_by == current_user.id
    is_privileged = current_user.role.value in ("administrator", "educator")
    if not (is_creator or is_privileged):
        raise HTTPException(status_code=403, detail="Only the creator or admin/educator can start sessions")

    session.status = SessionStatus.active
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{session_id}/complete", response_model=SessionRead)
async def complete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move session from active → completed."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.active:
        raise HTTPException(status_code=400, detail="Session is not in active state")

    is_creator = session.created_by == current_user.id
    is_privileged = current_user.role.value in ("administrator", "educator")
    if not (is_creator or is_privileged):
        raise HTTPException(status_code=403, detail="Access denied")

    session.status = SessionStatus.completed
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{session_id}/cancel", response_model=SessionRead)
async def cancel_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a scheduled or active session."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == SessionStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed session")

    is_creator = session.created_by == current_user.id
    is_admin = current_user.role.value == "administrator"
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")

    session.status = SessionStatus.cancelled
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


# ─── Participants ─────────────────────────────────────────────────────────────

@router.post("/{session_id}/join", response_model=ParticipantRead)
async def join_session(
    session_id: UUID,
    body: JoinSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a scheduled session with a chosen position."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.scheduled:
        raise HTTPException(status_code=400, detail="Can only join scheduled sessions")

    # Check if already joined
    existing = await db.execute(
        select(SessionParticipant).where(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already joined this session")

    participant = SessionParticipant(
        session_id=session_id,
        user_id=current_user.id,
        position=body.position,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.get("/{session_id}/participants", response_model=list[ParticipantRead])
async def list_participants(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SessionParticipant).where(SessionParticipant.session_id == session_id)
    )
    return result.scalars().all()


# ─── Presentation History ─────────────────────────────────────────────────────

@router.get("/presentations/me", response_model=list[PresentationRead])
async def list_my_presentations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PresentationHistory).where(PresentationHistory.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/presentations/me", response_model=PresentationRead, status_code=status.HTTP_201_CREATED)
async def add_presentation(
    body: PresentationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a new presentation entry. AI analysis hook reserved for Milestone 2+."""
    # TODO Milestone 2+: trigger presentation analysis pipeline
    presentation = PresentationHistory(user_id=current_user.id, **body.model_dump())
    db.add(presentation)
    await db.commit()
    await db.refresh(presentation)
    return presentation
