from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.debate import DebateSession
from app.models.analysis import (ArgumentAnalysis, PresentationSession,
                                 PresentationAnalysis, PerformanceEvaluation)
from app.core.deps import get_current_user, require_role
from app.schemas.dashboard import LearnerDashboard, AdminDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/learner", response_model=LearnerDashboard)
def learner_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_debates = db.query(func.count(DebateSession.id)).filter_by(user_id=user.id).scalar() or 0
    total_pres = db.query(func.count(PresentationSession.id)).filter_by(user_id=user.id).scalar() or 0
    evals = db.query(PerformanceEvaluation).filter_by(user_id=user.id).order_by(PerformanceEvaluation.created_at.desc()).all()
    avg = round(sum(e.overall_score for e in evals) / len(evals), 2) if evals else 0.0

    trend = [{"date": e.created_at.date().isoformat(), "score": e.overall_score} for e in reversed(evals[-20:])]

    recent_debates = db.query(DebateSession).filter_by(user_id=user.id).order_by(DebateSession.created_at.desc()).limit(5).all()
    recent_sessions = [
        {"id": s.id, "topic": s.topic, "status": s.status,
         "created_at": s.created_at.isoformat()} for s in recent_debates
    ]

    strengths, weaknesses = [], []
    if evals:
        strengths = evals[0].strengths or []
        weaknesses = evals[0].weaknesses or []

    feedback = [{"score": e.overall_score, "date": e.created_at.isoformat()} for e in evals[:5]]

    return LearnerDashboard(
        total_debates=total_debates,
        total_presentations=total_pres,
        average_score=avg,
        recent_sessions=recent_sessions,
        score_trend=trend,
        strengths=strengths,
        weaknesses=weaknesses,
        recent_feedback=feedback,
    )

@router.get("/coach")
def coach_dashboard(user: User = Depends(require_role("debate_coach", "educator", "admin")), db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    data = []
    for l in learners:
        evals = db.query(PerformanceEvaluation).filter_by(user_id=l.id).all()
        avg = round(sum(e.overall_score for e in evals) / len(evals), 2) if evals else 0.0
        data.append({"id": l.id, "name": l.full_name, "email": l.email,
                     "avg_score": avg, "evaluations": len(evals)})
    return {"learners": data}

@router.get("/educator")
def educator_dashboard(user: User = Depends(require_role("educator", "admin")), db: Session = Depends(get_db)):
    return coach_dashboard(user, db)

@router.get("/admin", response_model=AdminDashboard)
def admin_dashboard(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_counts = {r: c for r, c in role_rows}
    total_debates = db.query(func.count(DebateSession.id)).scalar() or 0
    total_pres = db.query(func.count(PresentationSession.id)).scalar() or 0
    total_analyses = db.query(func.count(ArgumentAnalysis.id)).scalar() or 0
    recent = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    recent_users = [{"id": u.id, "email": u.email, "role": u.role,
                     "created_at": u.created_at.isoformat()} for u in recent]
    return AdminDashboard(
        total_users=total_users, role_counts=role_counts,
        total_debates=total_debates, total_presentations=total_pres,
        total_analyses=total_analyses, recent_users=recent_users,
    )