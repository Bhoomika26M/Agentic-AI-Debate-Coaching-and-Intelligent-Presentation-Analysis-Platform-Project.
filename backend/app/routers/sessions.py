from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.debate_session import DebateSession
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.routers.users import get_current_user
from app.schemas.debate_session import SessionCreate, SessionUpdate, SessionOut, SessionEvaluation

router = APIRouter(prefix="/sessions", tags=["Debate Sessions"])


def _check_and_expire_sessions(sessions: list[DebateSession]) -> bool:
    """Check if scheduled/active sessions exceeded their duration and mark them expired."""
    now = datetime.now(timezone.utc)
    changed = False
    for s in sessions:
        if s.status in ("scheduled", "active") and s.score is None:
            ref_time = s.scheduled_at or s.created_at
            if ref_time:
                if ref_time.tzinfo is None:
                    ref_time = ref_time.replace(tzinfo=timezone.utc)
                duration = timedelta(minutes=s.duration_minutes or 15)
                if now > (ref_time + duration):
                    s.status = "expired"
                    changed = True
    return changed


@router.get("", response_model=list[SessionOut])
@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List debate sessions.
    - Staff (Admin, Coach, Educator) see all sessions.
    - Learners see sessions assigned to them OR open rounds created by educators/coaches for participation.
    """
    if current_user.role in ("admin", "coach", "educator"):
        result = await db.execute(
            select(DebateSession).order_by(DebateSession.scheduled_at.desc())
        )
    else:
        result = await db.execute(
            select(DebateSession)
            .where(
                or_(
                    DebateSession.user_id == current_user.id,
                    DebateSession.creator_role.in_(["educator", "coach", "admin"])
                )
            )
            .order_by(DebateSession.scheduled_at.desc())
        )
    sessions = list(result.scalars().all())
    if _check_and_expire_sessions(sessions):
        await db.flush()
    return sessions


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new debate session.
    Only Educators, Coaches, and Admins can create debate sessions.
    Learners take part in existing rounds.
    """
    if current_user.role == "learner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Learners can participate in debate rounds and submit speech transcripts, but cannot create sessions. Your coach or educator will schedule rounds for you."
        )

    target_student_id = payload.user_id if payload.user_id else current_user.id

    session = DebateSession(
        user_id=target_student_id,
        creator_id=current_user.id,
        creator_role=current_user.role,
        creator_name=current_user.full_name,
        class_id=payload.class_id,
        topic=payload.topic,
        format=payload.format,
        position=payload.position,
        notes=payload.notes,
        scheduled_at=payload.scheduled_at or datetime.now(timezone.utc),
        round_count=payload.round_count,
        duration_minutes=payload.duration_minutes,
        transcript=payload.transcript,
        recording_url=payload.recording_url,
        key_arguments=payload.key_arguments or [],
    )
    db.add(session)
    await db.flush()

    # Update creator's / user's total_sessions count
    current_user.total_sessions = (current_user.total_sessions or 0) + 1

    # Send instant real-time notification to students
    now_time = datetime.now(timezone.utc)
    if payload.user_id and payload.user_id != current_user.id:
        db.add(Notification(
            user_id=payload.user_id,
            title="New Debate Round Scheduled 🎤",
            message=f"{current_user.full_name} ({current_user.role.capitalize()}) scheduled '{session.topic}' for your participation.",
            type=NotificationType.DEBATE_REMINDER,
            link="/sessions",
            created_at=now_time,
        ))
    else:
        # Broadcast to active learners so they can participate immediately
        learners_res = await db.execute(select(User).where(User.role == "learner"))
        for lr in learners_res.scalars().all():
            db.add(Notification(
                user_id=lr.id,
                title=f"New Debate Round: {session.topic[:35]}... 🎤",
                message=f"{current_user.full_name} ({current_user.role.capitalize()}) opened a debate round on '{session.topic}'. Submit your speech!",
                type=NotificationType.DEBATE_REMINDER,
                link="/sessions",
                created_at=now_time,
            ))
    await db.flush()

    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single debate session by ID."""
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


@router.put("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: str,
    payload: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a debate session.
    - Learners can update transcript / notes to submit speech.
    - If a learner submits transcript on an open session, bind user_id to learner so the grade applies to them.
    - Staff can update details or modify evaluation.
    """
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # If learner is updating transcript and the session user_id was the staff creator, bind it to the learner
    if current_user.role == "learner":
        if payload.transcript is not None:
            session.transcript = payload.transcript
            if session.user_id != current_user.id and session.creator_id != current_user.id:
                session.user_id = current_user.id
        if payload.notes is not None:
            session.notes = payload.notes
        if payload.position is not None:
            session.position = payload.position
    else:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(session, field, value)

    session.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return session


@router.put("/{session_id}/evaluate", response_model=SessionOut)
async def evaluate_session(
    session_id: str,
    payload: SessionEvaluation,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit debate evaluation and score.
    Strict Separation Rule:
    - If an Educator created the session, ONLY that Educator (or Admin) can grade it.
    - If a Coach created the session, ONLY that Coach (or Admin) can grade it.
    - Learner cannot grade.
    """
    if current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Only coaches, educators, or admins can evaluate sessions.")

    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Ownership checks: Educator vs Coach separation
    if current_user.role != "admin":
        if session.creator_role == "educator" and current_user.role == "coach":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This session was created by Educator {session.creator_name or 'an educator'}. Only that Educator (or Admin) can evaluate this session."
            )
        if session.creator_role == "coach" and current_user.role == "educator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This session was created by Coach {session.creator_name or 'a coach'}. Only that Coach (or Admin) can evaluate this session."
            )

    session.score = payload.score
    session.feedback_summary = payload.feedback_summary
    if payload.evaluation_criteria:
        session.evaluation_criteria = payload.evaluation_criteria
    session.status = "completed"
    session.updated_at = datetime.now(timezone.utc)

    # Also update the student's avg_score
    student_res = await db.execute(select(User).where(User.id == session.user_id))
    student = student_res.scalar_one_or_none()
    if student:
        completed_sessions = await db.execute(
            select(DebateSession).where(
                DebateSession.user_id == student.id,
                DebateSession.score.isnot(None)
            )
        )
        scores = [s.score for s in completed_sessions.scalars().all()]
        if scores:
            student.avg_score = round(sum(scores) / len(scores), 1)

    # Instant notification to student
    now_time = datetime.now(timezone.utc)
    if session.user_id:
        db.add(Notification(
            user_id=session.user_id,
            title=f"Debate Evaluated: Score {payload.score}/100 🏆",
            message=f"{current_user.full_name} ({current_user.role.capitalize()}) evaluated your speech on '{session.topic}'. Your official grade and feedback are locked.",
            type=NotificationType.COACHING_FEEDBACK,
            link="/sessions",
            created_at=now_time,
        ))

    await db.flush()
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel / delete a debate session."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.id and current_user.role != "admin" and session.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    await db.delete(session)
