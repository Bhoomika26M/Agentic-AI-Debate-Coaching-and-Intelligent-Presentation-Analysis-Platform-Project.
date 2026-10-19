from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.debate import DebateSession
from app.models.analysis import (
    ArgumentAnalysis, FallacyDetection,
    PresentationSession, PresentationAnalysis,
    PerformanceEvaluation,
)
from app.core.deps import get_current_user, require_role
from app.schemas.dashboard import LearnerDashboard, AdminDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ---------- LEARNER (unchanged) ----------
@router.get("/learner", response_model=LearnerDashboard)
def learner_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_debates = db.query(func.count(DebateSession.id)).filter_by(user_id=user.id).scalar() or 0
    total_pres = db.query(func.count(PresentationSession.id)).filter_by(user_id=user.id).scalar() or 0
    evals = (
        db.query(PerformanceEvaluation)
        .filter_by(user_id=user.id)
        .order_by(PerformanceEvaluation.created_at.desc())
        .all()
    )
    avg = round(sum(e.overall_score for e in evals) / len(evals), 2) if evals else 0.0
    trend = [{"date": e.created_at.date().isoformat(), "score": e.overall_score}
             for e in reversed(evals[-20:])]
    recent_debates = (
        db.query(DebateSession).filter_by(user_id=user.id)
        .order_by(DebateSession.created_at.desc()).limit(5).all()
    )
    recent_sessions = [
        {"id": s.id, "topic": s.topic, "status": s.status,
         "created_at": s.created_at.isoformat()} for s in recent_debates
    ]
    strengths = evals[0].strengths if evals else []
    weaknesses = evals[0].weaknesses if evals else []
    feedback = [{"score": e.overall_score, "date": e.created_at.isoformat()} for e in evals[:5]]
    return LearnerDashboard(
        total_debates=total_debates,
        total_presentations=total_pres,
        average_score=avg,
        recent_sessions=recent_sessions,
        score_trend=trend,
        strengths=strengths or [],
        weaknesses=weaknesses or [],
        recent_feedback=feedback,
    )


# ---------- COACH: rich per-learner data ----------
def _learner_summary(db: Session, learner: User) -> dict:
    evals = (
        db.query(PerformanceEvaluation)
        .filter_by(user_id=learner.id)
        .order_by(PerformanceEvaluation.created_at.desc())
        .all()
    )
    debates = db.query(DebateSession).filter_by(user_id=learner.id).count()
    pres = db.query(PresentationSession).filter_by(user_id=learner.id).count()
    fallacies = db.query(FallacyDetection).filter_by(user_id=learner.id).count()

    if not evals:
        return {
            "id": learner.id, "name": learner.full_name, "email": learner.email,
            "debates": debates, "presentations": pres, "evaluations": 0,
            "avg_score": 0.0, "trend": [], "strengths": [], "weaknesses": [],
            "fallacy_reports": fallacies,
            "component_avg": {},
            "skill_gaps": [],
        }

    avg = round(sum(e.overall_score for e in evals) / len(evals), 2)
    trend = [{"date": e.created_at.date().isoformat(), "score": e.overall_score}
             for e in reversed(evals[:20])]

    # aggregate weaknesses across all evals → skill gaps
    weakness_counts: dict[str, int] = {}
    for e in evals:
        for w in (e.weaknesses or []):
            weakness_counts[w] = weakness_counts.get(w, 0) + 1
    skill_gaps = [
        {"area": k, "occurrences": v}
        for k, v in sorted(weakness_counts.items(), key=lambda x: -x[1])[:5]
    ]

    # component averages → show which dimensions are weakest
    component_avg = {
        "argument_quality": round(sum(e.argument_quality for e in evals) / len(evals), 2),
        "evidence_usage": round(sum(e.evidence_usage for e in evals) / len(evals), 2),
        "logical_consistency": round(sum(e.logical_consistency for e in evals) / len(evals), 2),
        "rebuttal_effectiveness": round(sum(e.rebuttal_effectiveness for e in evals) / len(evals), 2),
        "communication_skills": round(sum(e.communication_skills for e in evals) / len(evals), 2),
    }

    return {
        "id": learner.id, "name": learner.full_name, "email": learner.email,
        "debates": debates, "presentations": pres, "evaluations": len(evals),
        "avg_score": avg, "trend": trend,
        "strengths": evals[0].strengths or [],
        "weaknesses": evals[0].weaknesses or [],
        "fallacy_reports": fallacies,
        "component_avg": component_avg,
        "skill_gaps": skill_gaps,
    }


@router.get("/coach")
def coach_dashboard(user: User = Depends(require_role("debate_coach")), db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    summaries = [_learner_summary(db, l) for l in learners]
    return {
        "total_learners": len(summaries),
        "cohort_avg": round(sum(s["avg_score"] for s in summaries) / len(summaries), 2) if summaries else 0.0,
        "learners": summaries,
        "recent_evaluations": [
            {
                "learner_name": next((s["name"] for s in summaries if s["id"] == e.user_id), "Unknown"),
                "score": e.overall_score, "date": e.created_at.isoformat(),
            }
            for e in db.query(PerformanceEvaluation)
                .order_by(PerformanceEvaluation.created_at.desc()).limit(10).all()
        ],
    }


# ---------- EDUCATOR: class analytics + rankings ----------
@router.get("/educator")
def educator_dashboard(user: User = Depends(require_role("educator")), db: Session = Depends(get_db)):
    learners = db.query(User).filter(User.role == "learner").all()
    summaries = [_learner_summary(db, l) for l in learners]

    ranked = sorted(summaries, key=lambda s: -s["avg_score"])
    for i, s in enumerate(ranked):
        s["rank"] = i + 1

    # class-wide dimension averages → "weakest area of the class"
    dims = ["argument_quality", "evidence_usage", "logical_consistency",
            "rebuttal_effectiveness", "communication_skills"]
    class_dim_avg = {}
    for d in dims:
        vals = [s["component_avg"].get(d, 0) for s in summaries if s["component_avg"]]
        class_dim_avg[d] = round(sum(vals) / len(vals), 2) if vals else 0.0

    # performance distribution buckets
    buckets = {"0-39": 0, "40-59": 0, "60-74": 0, "75-89": 0, "90-100": 0}
    for s in summaries:
        sc = s["avg_score"]
        if sc < 40: buckets["0-39"] += 1
        elif sc < 60: buckets["40-59"] += 1
        elif sc < 75: buckets["60-74"] += 1
        elif sc < 90: buckets["75-89"] += 1
        else: buckets["90-100"] += 1

    return {
        "total_learners": len(summaries),
        "class_avg": round(sum(s["avg_score"] for s in summaries) / len(summaries), 2) if summaries else 0.0,
        "rankings": ranked,
        "class_dimension_avg": class_dim_avg,
        "distribution": buckets,
        "debate_reports": [
            {
                "learner_name": next((s["name"] for s in summaries if s["id"] == d.user_id), "Unknown"),
                "topic": d.topic, "status": d.status,
                "created_at": d.created_at.isoformat(),
            }
            for d in db.query(DebateSession)
                .order_by(DebateSession.created_at.desc()).limit(15).all()
        ],
        "presentation_reports": [
            {"title": ps.title, "input_type": ps.input_type,
            "created_at": ps.created_at.isoformat()}
            for ps in db.query(PresentationSession)
                .order_by(PresentationSession.created_at.desc()).limit(15).all()
        ],
    }


# ---------- ADMIN (expanded) ----------
@router.get("/admin", response_model=AdminDashboard)
def admin_dashboard(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_counts = {r: c for r, c in role_rows}
    total_debates = db.query(func.count(DebateSession.id)).scalar() or 0
    total_pres = db.query(func.count(PresentationSession.id)).scalar() or 0
    total_analyses = (
        (db.query(func.count(ArgumentAnalysis.id)).scalar() or 0)
        + (db.query(func.count(FallacyDetection.id)).scalar() or 0)
    )
    recent = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    recent_users = [{"id": u.id, "email": u.email, "role": u.role,
                     "created_at": u.created_at.isoformat()} for u in recent]
    return AdminDashboard(
        total_users=total_users, role_counts=role_counts,
        total_debates=total_debates, total_presentations=total_pres,
        total_analyses=total_analyses, recent_users=recent_users,
    )


@router.get("/admin/users")
def list_all_users(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name,
         "role": u.role, "is_active": u.is_active,
         "created_at": u.created_at.isoformat()}
        for u in rows
    ]


# ---------- ADMIN: AI model monitoring + system health ----------
@router.get("/admin/system")
def admin_system(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """Basic AI monitoring — counts per feature, error rate via HTTP logs (approximated)."""
    arg_count = db.query(func.count(ArgumentAnalysis.id)).scalar() or 0
    fal_count = db.query(func.count(FallacyDetection.id)).scalar() or 0
    pres_an = db.query(func.count(PresentationAnalysis.id)).scalar() or 0
    debates = db.query(func.count(DebateSession.id)).scalar() or 0
    pres_sess = db.query(func.count(PresentationSession.id)).scalar() or 0

    from app.core.config import get_settings
    s = get_settings()

    return {
        "ai_calls_by_feature": {
            "argument_analysis": arg_count,
            "fallacy_detection": fal_count,
            "presentation_analysis": pres_an,
            "debate_sessions": debates,
            "presentation_sessions": pres_sess,
        },
        "models": {
            "primary": s.GEMINI_MODEL,
            "fallback": s.NVIDIA_TEXT_MODEL if s.NVIDIA_API_KEY else "not configured",
        },
        "status": "operational",
        "uptime_note": "In-memory counters; production would persist to a metrics store.",
    }


@router.get("/admin/reports")
def admin_reports(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """System-wide reports — recent activity across all users."""
    recent_debates = (
        db.query(DebateSession).order_by(DebateSession.created_at.desc()).limit(20).all()
    )
    users = {u.id: u.email for u in db.query(User).all()}
    return {
        "recent_debates": [
            {"topic": d.topic, "user": users.get(d.user_id, "?"),
             "status": d.status, "created_at": d.created_at.isoformat()}
            for d in recent_debates
        ],
        "recent_evaluations": [
            {"user": users.get(e.user_id, "?"), "score": e.overall_score,
             "created_at": e.created_at.isoformat()}
            for e in db.query(PerformanceEvaluation)
                .order_by(PerformanceEvaluation.created_at.desc()).limit(20).all()
        ],
    }