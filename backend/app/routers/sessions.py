from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.debate_session import DebateSession
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.debate_session import SessionCreate, SessionUpdate, SessionOut, SessionEvaluation

router = APIRouter(prefix="/sessions", tags=["Debate Sessions"])


@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List debate sessions. Learners see their own; Coaches/Admins see all."""
    if current_user.role in ("admin", "coach", "educator"):
        result = await db.execute(
            select(DebateSession).order_by(DebateSession.scheduled_at.desc())
        )
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id == current_user.id)
            .order_by(DebateSession.scheduled_at.desc())
        )
    return result.scalars().all()


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new debate session."""
    session = DebateSession(user_id=current_user.id, **payload.model_dump())
    db.add(session)
    await db.flush()

    # Update user's total_sessions count
    current_user.total_sessions = (current_user.total_sessions or 0) + 1
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
    if session.user_id != current_user.id and current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Access denied.")
    return session


@router.put("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: str,
    payload: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a debate session. Owner, Coach, Educator, or Admin."""
    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.id and current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Access denied.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.flush()
    return session


@router.put("/{session_id}/evaluate", response_model=SessionOut)
async def evaluate_session(
    session_id: str,
    payload: SessionEvaluation,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit debate evaluation and score. Coaches, Educators, and Admins only."""
    if current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Only coaches, educators, or admins can evaluate sessions.")

    result = await db.execute(select(DebateSession).where(DebateSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    session.score = payload.score
    session.feedback_summary = payload.feedback_summary
    if payload.evaluation_criteria:
        session.evaluation_criteria = payload.evaluation_criteria
    session.status = "completed"

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
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    await db.delete(session)
