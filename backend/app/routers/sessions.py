import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.debate_session import DebateSession
from app.models.user import User
from app.models.classroom import Classroom
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


async def _get_allowed_student_ids(user: User, db: AsyncSession) -> list[str]:
    """Retrieve list of student IDs assigned to this coach or educator."""
    if user.role == "admin":
        res = await db.execute(select(User.id).where(User.role == "learner"))
        return list(res.scalars().all())
    elif user.role == "coach":
        cls_res = await db.execute(select(Classroom).where(Classroom.coach_id == user.id))
        classes = cls_res.scalars().all()
    elif user.role == "educator":
        cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == user.id))
        classes = cls_res.scalars().all()
    else:
        return [user.id]

    student_set = set()
    for c in classes:
        for sid in (c.student_ids or []):
            if sid:
                student_set.add(str(sid))
    return list(student_set)


@router.get("", response_model=list[SessionOut])
@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List debate sessions with strict privacy and class scoping:
    - Learners strictly see sessions where user_id == current_user.id.
    - Coaches see sessions they created OR sessions belonging to their assigned classroom students.
    - Educators see sessions they created OR sessions belonging to their classroom students.
    - Admins see all sessions.
    """
    if current_user.role == "admin":
        result = await db.execute(
            select(DebateSession).order_by(DebateSession.scheduled_at.desc())
        )
    elif current_user.role == "learner":
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id == current_user.id)
            .order_by(DebateSession.scheduled_at.desc())
        )
    else:
        # Coach or Educator
        allowed_sids = await _get_allowed_student_ids(current_user, db)
        condition = [DebateSession.creator_id == current_user.id]
        if allowed_sids:
            condition.append(DebateSession.user_id.in_(allowed_sids))
        result = await db.execute(
            select(DebateSession)
            .where(or_(*condition))
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
    Create debate session(s).
    - If user_id is 'personal' or current_user.id: creates personal self-practice session.
    - If specific user_id is provided: creates 1 session for that specific student.
    - If class_id is provided or user_id is empty ('all class students'):
      Resolves the assigned students for this coach/educator/class, and creates
      an INDIVIDUAL DebateSession for EACH student.
      This ensures each student has their own clean transcript and submissions
      NEVER overwrite one another.
    """
    if current_user.role == "learner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Learners can participate in debate rounds and submit speech transcripts, but cannot create sessions. Your coach or educator will schedule rounds for you."
        )

    # 1. Resolve Target Students
    if payload.user_id in (current_user.id, "personal"):
        target_student_ids = [current_user.id]
        assigned_class_id = None
    elif payload.user_id and payload.user_id.strip():
        target_student_ids = [payload.user_id.strip()]
        assigned_class_id = payload.class_id
    elif payload.class_id:
        cls_res = await db.execute(select(Classroom).where(Classroom.id == payload.class_id))
        cls = cls_res.scalar_one_or_none()
        target_student_ids = [str(x) for x in (cls.student_ids or []) if x] if cls else []
        assigned_class_id = payload.class_id
    else:
        # Open for all class students under this coach / educator
        target_student_ids = await _get_allowed_student_ids(current_user, db)
        assigned_class_id = payload.class_id

    # If no enrolled students found (e.g. coach has no classes yet), fallback to personal
    if not target_student_ids:
        target_student_ids = [current_user.id]
        assigned_class_id = None

    now_time = datetime.now(timezone.utc)
    created_sessions = []

    # Map student names for quick rendering
    user_map = {}
    if target_student_ids:
        u_res = await db.execute(select(User).where(User.id.in_(target_student_ids)))
        user_map = {u.id: u for u in u_res.scalars().all()}

    for st_id in target_student_ids:
        st_user = user_map.get(st_id)
        st_name = st_user.full_name if st_user else (current_user.full_name if st_id == current_user.id else None)
        st_email = st_user.email if st_user else (current_user.email if st_id == current_user.id else None)

        session = DebateSession(
            id=str(uuid.uuid4()),
            user_id=st_id,
            student_name=st_name,
            student_email=st_email,
            creator_id=current_user.id,
            creator_role=current_user.role,
            creator_name=current_user.full_name,
            class_id=assigned_class_id,
            topic=payload.topic,
            format=payload.format,
            position=payload.position,
            notes=payload.notes,
            status="scheduled",
            scheduled_at=payload.scheduled_at or now_time,
            round_count=payload.round_count,
            duration_minutes=payload.duration_minutes,
            transcript=payload.transcript if st_id == current_user.id else None,
            recording_url=payload.recording_url,
            key_arguments=payload.key_arguments or [],
            created_at=now_time,
            updated_at=now_time,
        )
        db.add(session)
        created_sessions.append(session)

        # Notify student (do not notify creator if self-practice)
        if st_id != current_user.id:
            db.add(Notification(
                user_id=st_id,
                title="New Debate Round Scheduled 🎤",
                message=f"{current_user.full_name} ({current_user.role.capitalize()}) scheduled '{session.topic}' for you.",
                type=NotificationType.DEBATE_REMINDER,
                link="/sessions",
                created_at=now_time,
            ))

    current_user.total_sessions = (current_user.total_sessions or 0) + len(created_sessions)
    await db.flush()

    return created_sessions[0]


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
    - Learners can update transcript / notes on their own session only.
    - Staff can update details or modify evaluation.
    """
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if current_user.role == "learner":
        if session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only submit transcripts for debate sessions assigned to your account."
            )
        if payload.transcript is not None:
            session.transcript = payload.transcript
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
