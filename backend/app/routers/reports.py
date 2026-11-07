"""
Reports & Export Router — Milestone 4 & RBAC Separation
- Cohort Performance Reports (Strictly includes learners only; excludes coaches/educators)
- Class & Coaches Group Reports
- Individual Student Drilldown Reports
- Personal Self-Improvement Reports (for Coach, Educator, and Admin self-practice)
- Full CSV, Excel (.xlsx), and PDF Exports
- Admin Platform Telemetry & Coach-Student Mapping
"""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.debate_session import DebateSession
from app.models.user import User
from app.models.classroom import Classroom
from app.routers.users import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


async def _resolve_report_scope(
    db: AsyncSession,
    current_user: User,
    student_id: str | None = None,
):
    """
    Resolves the user scope for reporting.
    Strict Rule:
    - In cohort analytics, Coach and Educator progress must NOT be considered.
      Only learners (User.role == 'learner') are included.
    - Educators, Coaches, and Admins can view/download their personal reports for self-improvement.
    """
    # 1. Learner always sees strictly their own individual report
    if current_user.role == "learner":
        return {
            "scope_type": "personal",
            "is_individual": True,
            "target_user": current_user,
            "user_ids": [current_user.id],
            "scope_name": current_user.full_name,
        }

    # 2. Staff personal report for self-improvement
    if student_id in ("personal", current_user.id):
        return {
            "scope_type": "personal",
            "is_individual": True,
            "target_user": current_user,
            "user_ids": [current_user.id],
            "scope_name": f"{current_user.full_name} (Personal Self-Improvement)",
        }

    # 3. Coaches group report
    if student_id == "coaches":
        if current_user.role == "coach":
            raise HTTPException(
                status_code=403,
                detail="Coaches cannot view group coach report analysis. Only educators and admins have access to coaching group reports."
            )
        if current_user.role == "educator":
            cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == current_user.id))
            educator_classes = cls_res.scalars().all()
            coach_ids = [c.coach_id for c in educator_classes if c.coach_id]
            if coach_ids:
                c_res = await db.execute(select(User).where(User.id.in_(coach_ids)))
                coaches = c_res.scalars().all()
            else:
                coaches = []
            return {
                "scope_type": "coaches",
                "is_individual": False,
                "target_user": None,
                "user_ids": [c.id for c in coaches],
                "scope_name": f"Assigned Coaches under {current_user.full_name}",
            }
        else:
            c_res = await db.execute(select(User).where(User.role == "coach"))
            coaches = c_res.scalars().all()
            return {
                "scope_type": "coaches",
                "is_individual": False,
                "target_user": None,
                "user_ids": [c.id for c in coaches],
                "scope_name": "Coaches Group (Activities & Sessions)",
            }

    # 4. Class group report
    if student_id and student_id.startswith("class:"):
        class_id = student_id.split(":", 1)[1]
        cls_res = await db.execute(select(Classroom).where(Classroom.id == class_id))
        cls = cls_res.scalar_one_or_none()
        st_ids = cls.student_ids or [] if cls else []
        return {
            "scope_type": "class",
            "is_individual": False,
            "target_user": None,
            "user_ids": st_ids,
            "scope_name": f"Class: {cls.name} (Learners Group)" if cls else "Class Group",
        }

    # 5. Specific individual student
    if student_id and student_id != "all":
        st_res = await db.execute(select(User).where(User.id == student_id))
        st = st_res.scalar_one_or_none()
        if st:
            return {
                "scope_type": "student",
                "is_individual": True,
                "target_user": st,
                "user_ids": [st.id],
                "scope_name": st.full_name,
            }

    # 6. Default cohort view: STRICTLY learners only!
    if current_user.role == "coach":
        cls_res = await db.execute(select(Classroom).where(Classroom.coach_id == current_user.id))
        classes = cls_res.scalars().all()
        student_ids = set()
        for c in classes:
            for sid in (c.student_ids or []):
                if sid: student_ids.add(str(sid))
        user_ids = list(student_ids)
        scope_name = "My Assigned Students (Cohort Overview)"
    elif current_user.role == "educator":
        cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == current_user.id))
        classes = cls_res.scalars().all()
        student_ids = set()
        for c in classes:
            for sid in (c.student_ids or []):
                if sid: student_ids.add(str(sid))
        user_ids = list(student_ids)
        scope_name = f"My Enrolled Students ({current_user.full_name})"
    else:
        l_res = await db.execute(select(User).where(User.role == "learner"))
        learners = l_res.scalars().all()
        user_ids = [l.id for l in learners]
        scope_name = "All Debater Students (Cohort Overview)"

    return {
        "scope_type": "cohort",
        "is_individual": False,
        "target_user": None,
        "user_ids": user_ids,
        "scope_name": scope_name,
    }


@router.get("/students")
async def list_students_for_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List debater students (learners only) for drilldown, scoped by role."""
    if current_user.role not in ("admin", "coach", "educator"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if current_user.role == "coach":
        cls_res = await db.execute(select(Classroom).where(Classroom.coach_id == current_user.id))
        classes = cls_res.scalars().all()
        sids = set()
        for c in classes:
            for sid in (c.student_ids or []):
                if sid: sids.add(str(sid))
        if not sids:
            return []
        result = await db.execute(select(User).where(User.id.in_(list(sids))).order_by(User.full_name))
    elif current_user.role == "educator":
        cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == current_user.id))
        classes = cls_res.scalars().all()
        sids = set()
        for c in classes:
            for sid in (c.student_ids or []):
                if sid: sids.add(str(sid))
        if not sids:
            return []
        result = await db.execute(select(User).where(User.id.in_(list(sids))).order_by(User.full_name))
    else:
        result = await db.execute(select(User).where(User.role == "learner").order_by(User.full_name))

    students = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.full_name,
            "email": s.email,
            "role": s.role,
            "experience_level": s.experience_level or "Beginner",
            "avg_score": s.avg_score or 0.0,
            "total_sessions": s.total_sessions or 0,
            "win_streak": s.win_streak or 0,
            "debate_topics": s.debate_topics or [],
        }
        for s in students
    ]


@router.get("/scopes")
async def get_report_scopes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all available report scopes: Students, Classes, Coaches, and Personal."""
    if current_user.role not in ("admin", "coach", "educator"):
        return {"scopes": [{"id": "personal", "name": f"My Personal Report ({current_user.full_name})", "type": "personal"}]}

    # 1. Learners (scoped)
    if current_user.role == "coach":
        cls_res = await db.execute(select(Classroom).where(Classroom.coach_id == current_user.id))
        classes_obj = cls_res.scalars().all()
        sids = set()
        for c in classes_obj:
            for sid in (c.student_ids or []):
                if sid: sids.add(str(sid))
        if sids:
            st_res = await db.execute(select(User).where(User.id.in_(list(sids))).order_by(User.full_name))
            students_obj = st_res.scalars().all()
        else:
            students_obj = []
    elif current_user.role == "educator":
        cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == current_user.id))
        classes_obj = cls_res.scalars().all()
        sids = set()
        for c in classes_obj:
            for sid in (c.student_ids or []):
                if sid: sids.add(str(sid))
        if sids:
            st_res = await db.execute(select(User).where(User.id.in_(list(sids))).order_by(User.full_name))
            students_obj = st_res.scalars().all()
        else:
            students_obj = []
    else:
        st_res = await db.execute(select(User).where(User.role == "learner").order_by(User.full_name))
        students_obj = st_res.scalars().all()

    students = [{"id": s.id, "name": s.full_name, "email": s.email, "avg_score": s.avg_score or 0.0} for s in students_obj]

    # 2. Classes
    if current_user.role == "educator":
        cls_res = await db.execute(select(Classroom).where(Classroom.educator_id == current_user.id).order_by(Classroom.name))
    elif current_user.role == "coach":
        cls_res = await db.execute(select(Classroom).where(Classroom.coach_id == current_user.id).order_by(Classroom.name))
    else:
        cls_res = await db.execute(select(Classroom).order_by(Classroom.name))
    classes = [{"id": f"class:{c.id}", "name": c.name, "student_count": len(c.student_ids or [])} for c in cls_res.scalars().all()]

    # 3. Coaches Group (Strictly for Educator and Admin, NOT for Coach)
    coaches_group = None
    if current_user.role in ("educator", "admin"):
        coaches_group = {"id": "coaches", "name": "🏆 Coaches Group (Activities & Records)", "type": "group"}

    return {
        "personal": {"id": "personal", "name": f"⭐ My Personal Report ({current_user.full_name})", "type": "personal"},
        "cohort": {"id": "all", "name": "👥 All Debater Students (Cohort Overview)", "type": "cohort"},
        "classes": classes,
        "coaches_group": coaches_group,
        "students": students,
    }


# ── 1. Aggregated Performance Score Reports ───────────────────────────────────

@router.get("/performance")
async def get_performance_report(
    student_id: str | None = Query(None, description="Optional target student ID or scope"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return comprehensive performance analytics.
    Excludes coach and educator progress from cohort evaluation.
    """
    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.asc())
        )
        sessions = result.scalars().all()

    total_sessions = len(sessions)
    completed = [s for s in sessions if s.status == "completed" and s.score is not None]
    in_progress = [s for s in sessions if s.status == "in_progress"]
    scheduled = [s for s in sessions if s.status == "scheduled"]

    scores = [s.score for s in completed]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    max_score = max(scores) if scores else 0
    min_score = min(scores) if scores else 0

    recent_scores = [
        {
            "session": s.topic[:30] if s.topic else f"Session {i+1}",
            "score": s.score,
            "date": s.scheduled_at.isoformat() if s.scheduled_at else None,
        }
        for i, s in enumerate(completed[-10:])
    ]

    skill_totals: dict[str, list[float]] = {}
    for s in completed:
        if s.evaluation_criteria:
            for k, v in s.evaluation_criteria.items():
                if isinstance(v, (int, float)):
                    skill_totals.setdefault(k, []).append(float(v))

    skill_averages = {k: round(sum(v) / len(v), 1) for k, v in skill_totals.items()}

    format_counts: dict[str, int] = {}
    for s in sessions:
        fmt = s.format or "Other"
        format_counts[fmt] = format_counts.get(fmt, 0) + 1

    improvement_trend = "Improving" if len(scores) >= 2 and scores[-1] > scores[0] else (
        "Declining" if len(scores) >= 2 and scores[-1] < scores[0] else "Stable"
    )

    target_user = scope["target_user"]
    user_data = {
        "id": target_user.id if target_user else "cohort",
        "name": scope["scope_name"],
        "role": target_user.role if target_user else "cohort",
        "member_since": target_user.created_at.isoformat() if target_user and target_user.created_at else None,
    }

    return {
        "is_individual": scope["is_individual"],
        "scope_type": scope["scope_type"],
        "scope_name": scope["scope_name"],
        "user": user_data,
        "session_statistics": {
            "total": total_sessions,
            "completed": len(completed),
            "in_progress": len(in_progress),
            "scheduled": len(scheduled),
            "completion_rate": round(len(completed) / total_sessions * 100, 1) if total_sessions > 0 else 0,
        },
        "score_statistics": {
            "average": avg_score,
            "highest": max_score,
            "lowest": min_score,
            "improvement_trend": improvement_trend,
        },
        "score_trend": recent_scores,
        "skill_averages": skill_averages,
        "format_distribution": format_counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 2. Debate Reports ─────────────────────────────────────────────────────────

@router.get("/debate")
async def get_debate_reports(
    student_id: str | None = Query(None, description="Optional target student ID or scope"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Detailed Debate Reports across debate formats.
    Strictly isolates cohort from staff sessions.
    """
    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.desc())
        )
        sessions = result.scalars().all()
    completed = [s for s in sessions if s.status == "completed"]

    format_stats = {}
    for s in sessions:
        fmt = s.format or "One-on-One Debate"
        if fmt not in format_stats:
            format_stats[fmt] = {"total": 0, "completed": 0, "scores": []}
        format_stats[fmt]["total"] += 1
        if s.score is not None:
            format_stats[fmt]["completed"] += 1
            format_stats[fmt]["scores"].append(s.score)

    format_analysis = [
        {
            "format": fmt,
            "total_sessions": data["total"],
            "completed_sessions": data["completed"],
            "average_score": round(sum(data["scores"]) / len(data["scores"]), 1) if data["scores"] else 0.0,
            "mastery_level": "Advanced" if data["scores"] and sum(data["scores"])/len(data["scores"]) >= 80 else ("Intermediate" if data["scores"] and sum(data["scores"])/len(data["scores"]) >= 65 else "Developing"),
        }
        for fmt, data in format_stats.items()
    ]

    target_user = scope["target_user"]
    return {
        "user_id": target_user.id if target_user else "cohort",
        "user_name": scope["scope_name"],
        "scope_type": scope["scope_type"],
        "total_debates": len(sessions),
        "completed_debates": len(completed),
        "current_win_streak": target_user.win_streak if target_user else 0,
        "format_breakdown": format_analysis,
        "recent_debates": [
            {
                "id": s.id,
                "topic": s.topic,
                "format": s.format,
                "position": s.position,
                "score": s.score,
                "date": s.scheduled_at.isoformat() if s.scheduled_at else None,
                "feedback": s.feedback_summary,
            }
            for s in sessions[:10]
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 3. Presentation Assessment Reports ────────────────────────────────────────

@router.get("/presentation")
async def get_presentation_reports(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Presentation Assessment Reports for the selected scope."""
    scope = await _resolve_report_scope(db, current_user, student_id)
    history = []

    if scope["is_individual"] and scope["target_user"]:
        history = list(scope["target_user"].presentation_history or [])
    else:
        # Group aggregation
        if scope["user_ids"]:
            u_res = await db.execute(select(User).where(User.id.in_(scope["user_ids"])))
            for u in u_res.scalars().all():
                if u.presentation_history:
                    history.extend(u.presentation_history)

    total_pres = len(history)
    scores = [h.get("overall_score", 70) for h in history]
    wpms = [h.get("words_per_minute", 135) for h in history]
    fillers = [h.get("filler_rate_percent", 2.5) for h in history]

    avg_score = round(sum(scores) / len(scores), 1) if scores else 76.0
    avg_wpm = round(sum(wpms) / len(wpms), 1) if wpms else 138.0
    avg_fillers = round(sum(fillers) / len(fillers), 2) if fillers else 2.2

    return {
        "user_id": scope["target_user"].id if scope["target_user"] else "cohort",
        "scope_name": scope["scope_name"],
        "total_presentations_analyzed": total_pres,
        "metrics_summary": {
            "average_presentation_score": avg_score,
            "average_wpm": avg_wpm,
            "optimal_wpm_range": "120 - 160 WPM",
            "average_filler_rate_percent": avg_fillers,
            "target_filler_rate": "< 2.0%",
        },
        "history": list(reversed(history[-10:])),
        "coaching_takeaways": [
            "Pacing is currently well-balanced for argumentative speeches.",
            "Continue pausing deliberately instead of verbal fillers during transitions.",
            "Use rhetorical signposting to guide listeners through complex proofs.",
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 4. Coaching Reports ───────────────────────────────────────────────────────

@router.get("/coaching")
async def get_coaching_reports(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Coaching Reports for the selected scope."""
    scope = await _resolve_report_scope(db, current_user, student_id)
    skills = {}

    if scope["is_individual"] and scope["target_user"]:
        skills = dict(scope["target_user"].communication_skills or {})
    else:
        if scope["user_ids"]:
            u_res = await db.execute(select(User).where(User.id.in_(scope["user_ids"])))
            aggregated = {}
            count = 0
            for u in u_res.scalars().all():
                if u.communication_skills:
                    count += 1
                    for k, v in u.communication_skills.items():
                        if isinstance(v, (int, float)):
                            aggregated[k] = aggregated.get(k, 0.0) + float(v)
            if count > 0:
                skills = {k: round(v / count, 1) for k, v in aggregated.items()}

    default_skills = {
        "clarity_score": 75,
        "evidence_strength": 70,
        "logical_consistency": 72,
        "persuasiveness": 74,
        "rebuttal_depth": 68,
        "speaking_pace": 135,
        "confidence_score": 80,
    }
    for k, v in default_skills.items():
        skills.setdefault(k, v)

    strengths = [k.replace("_", " ").title() for k, v in skills.items() if isinstance(v, (int, float)) and v >= 75]
    focus_areas = [k.replace("_", " ").title() for k, v in skills.items() if isinstance(v, (int, float)) and v < 75]

    return {
        "user_id": scope["target_user"].id if scope["target_user"] else "cohort",
        "scope_name": scope["scope_name"],
        "radar_metrics": skills,
        "top_strengths": strengths or ["Logical Structure", "Vocabulary Precision"],
        "priority_focus_areas": focus_areas or ["Cross-Examination Rebuttal", "Pacing Regulation"],
        "recommended_drills": [
            {"title": "Evidence Marshalling Drill", "duration": "15 mins", "frequency": "3x / week", "focus": "Empirical grounding"},
            {"title": "Cross-Examination Rebuttal Spar", "duration": "20 mins", "frequency": "2x / week", "focus": "Real-time fallacy rebuttal"},
            {"title": "Pacing & Prosody Vocal Drill", "duration": "10 mins", "frequency": "Daily", "focus": "Cadence regulation"},
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 5. Learning Progress Reports ──────────────────────────────────────────────

@router.get("/learning-progress")
async def get_learning_progress_report(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Learning Progress & Milestone completion for the selected scope."""
    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession).where(DebateSession.user_id.in_(user_ids))
        )
        sessions = result.scalars().all()

    completed = len([s for s in sessions if s.status == "completed"])
    milestones = [
        {"milestone": 1, "week": 1, "title": "Foundation & Argument Mapping", "completed": completed >= 1, "criteria": "1 debate session"},
        {"milestone": 2, "week": 2, "title": "Fallacy Avoidance & Counterarguments", "completed": completed >= 3, "criteria": "3 completed debate rounds"},
        {"milestone": 3, "week": 3, "title": "Timed Cross-Examination Mastery", "completed": completed >= 5, "criteria": "5 sessions with score > 70"},
        {"milestone": 4, "week": 4, "title": "Championship Readiness & Delivery Flow", "completed": completed >= 10, "criteria": "10 sessions with mastery"},
    ]

    return {
        "user_id": scope["target_user"].id if scope["target_user"] else "cohort",
        "scope_name": scope["scope_name"],
        "current_level": "Intermediate" if completed >= 5 else ("Beginner" if completed < 3 else "Developing"),
        "total_sessions_completed": completed,
        "milestones": milestones,
        "completion_rate_percent": round(sum(1 for m in milestones if m["completed"]) / len(milestones) * 100),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 6. Sessions Summary Report ────────────────────────────────────────────────

@router.get("/sessions/summary")
async def get_sessions_summary_report(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tabular record of debate rounds for the selected scope."""
    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.desc())
        )
        sessions = result.scalars().all()

    return {
        "scope_name": scope["scope_name"],
        "total_records": len(sessions),
        "sessions": [
            {
                "id": s.id,
                "topic": s.topic,
                "format": s.format,
                "position": s.position,
                "status": s.status,
                "score": s.score,
                "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
                "feedback_summary": s.feedback_summary,
            }
            for s in sessions
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── 7. Export System: CSV, Excel & PDF ─────────────────────────────────────────

@router.get("/export/csv")
async def export_sessions_csv(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export debate sessions as a CSV file download."""
    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.desc())
        )
        sessions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Session ID", "Topic", "Format", "Position", "Status", "Score",
        "Feedback Summary", "Scheduled At"
    ])
    for s in sessions:
        writer.writerow([
            s.id,
            s.topic or "",
            s.format or "",
            s.position or "",
            s.status,
            s.score or "",
            (s.feedback_summary or "")[:200],
            s.scheduled_at.isoformat() if s.scheduled_at else "",
        ])

    csv_content = output.getvalue()
    safe_name = scope["scope_name"].replace(" ", "_").replace(":", "")[:30]
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=debate_report_{safe_name}.csv"},
    )


@router.get("/export/excel")
async def export_sessions_excel(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export comprehensive multi-sheet Excel (.xlsx) workbook."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment

    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.desc())
        )
        sessions = result.scalars().all()

    wb = Workbook()
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    title_font = Font(name="Calibri", size=14, bold=True, color="1F2937")

    # Sheet 1: Performance Summary
    ws1 = wb.active
    ws1.title = "Performance Summary"
    ws1.append(["Agentic AI Debate Coach & Presentation Platform"])
    ws1["A1"].font = title_font
    ws1.append([f"Report Scope: {scope['scope_name']}", f"Exported By: {current_user.full_name} ({current_user.role})"])
    ws1.append([])

    ws1.append(["Metric", "Score / Value", "Benchmark"])
    ws1.row_dimensions[4].height = 24
    for col in range(1, 4):
        cell = ws1.cell(row=4, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    completed = [s for s in sessions if s.score is not None]
    avg_score = round(sum(s.score for s in completed) / len(completed), 1) if completed else 0.0

    summary_rows = [
        ("Average Debate Score", avg_score, "80.0"),
        ("Total Sessions Conducted", len(sessions), "10+"),
        ("Completed Sessions", len(completed), "5+"),
        ("Active Learners In Scope", len(user_ids), "—"),
    ]
    for row in summary_rows:
        ws1.append(list(row))

    # Sheet 2: Debate Sessions
    ws2 = wb.create_sheet(title="Debate Sessions")
    headers2 = ["Session ID", "Topic", "Format", "Position", "Status", "Score", "Date", "Feedback"]
    ws2.append(headers2)
    ws2.row_dimensions[1].height = 24
    for col in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for s in sessions:
        ws2.append([
            str(s.id)[:8],
            s.topic or "",
            s.format or "",
            s.position or "",
            s.status,
            s.score or "N/A",
            s.scheduled_at.strftime("%Y-%m-%d %H:%M") if s.scheduled_at else "",
            s.feedback_summary or "",
        ])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    safe_name = scope["scope_name"].replace(" ", "_").replace(":", "")[:30]
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=debate_report_{safe_name}.xlsx"},
    )


@router.get("/export/pdf")
async def export_sessions_pdf(
    student_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export an Executive PDF Report formatted using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    scope = await _resolve_report_scope(db, current_user, student_id)
    user_ids = scope["user_ids"]

    if not user_ids:
        sessions = []
    else:
        result = await db.execute(
            select(DebateSession)
            .where(DebateSession.user_id.in_(user_ids))
            .order_by(DebateSession.scheduled_at.desc())
        )
        sessions = result.scalars().all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "PlatformTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#4F46E5"),
    )
    subtitle_style = ParagraphStyle(
        "PlatformSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#6B7280"),
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
    )

    story = [
        Paragraph("DebateCoach AI — Executive Report", title_style),
        Paragraph(f"Scope: {scope['scope_name']} | Exported By: {current_user.full_name} ({current_user.role.capitalize()}) | {datetime.now(timezone.utc).strftime('%B %d, %Y')}", subtitle_style),
        Spacer(1, 14),
    ]

    completed = [s for s in sessions if s.score is not None]
    avg_score = round(sum(s.score for s in completed) / len(completed), 1) if completed else 0.0

    summary_data = [
        ["Metric", "Value", "Benchmark Target"],
        ["Average Debate Score", f"{avg_score} / 100", "80.0+"],
        ["Total Sessions Conducted", str(len(sessions)), "10+ rounds"],
        ["Completed Evaluated Rounds", str(len(completed)), "5+ rounds"],
        ["Active Accounts In Scope", str(len(user_ids)), "—"],
    ]

    t_summary = Table(summary_data, colWidths=[200, 160, 160])
    t_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
    ]))
    story.append(Paragraph("Performance Metrics", section_style))
    story.append(t_summary)
    story.append(Spacer(1, 14))

    # Sessions table
    session_rows = [["ID", "Topic / Resolution", "Format", "Score", "Date"]]
    for s in sessions[:12]:
        session_rows.append([
            str(s.id)[:6],
            Paragraph((s.topic or "Untitled")[:45], body_style),
            (s.format or "1-on-1")[:15],
            f"{s.score:.1f}" if s.score else "N/A",
            s.scheduled_at.strftime("%Y-%m-%d") if s.scheduled_at else "",
        ])

    if len(session_rows) > 1:
        t_sessions = Table(session_rows, colWidths=[50, 240, 100, 50, 80])
        t_sessions.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ]))
        story.append(Paragraph("Debate Session Records", section_style))
        story.append(t_sessions)

    doc.build(story)
    buffer.seek(0)

    safe_name = scope["scope_name"].replace(" ", "_").replace(":", "")[:30]
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=debate_report_{safe_name}.pdf"},
    )


# ── 8. Admin Platform Analytics Overview ──────────────────────────────────────

@router.get("/admin/overview")
async def admin_platform_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin dashboard:
    - Total number of educators
    - Number of coaches under educator (in classes) & total coaches
    - Number of students under each coach
    - Total students (learners)
    - App management & user directory
    (Total sessions, AI calls today, and uptime cards are replaced as requested)
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    # All users
    user_result = await db.execute(select(User))
    all_users = user_result.scalars().all()

    educators = [u for u in all_users if u.role == "educator"]
    coaches = [u for u in all_users if u.role == "coach"]
    learners = [u for u in all_users if u.role == "learner"]

    # Classrooms & Coach-Student Breakdown
    cls_result = await db.execute(select(Classroom))
    classrooms = cls_result.scalars().all()

    coach_map = {c.id: c.full_name for c in coaches}
    coaches_under_educator = set()
    coach_student_breakdown = {}

    for c in classrooms:
        if c.coach_id:
            coaches_under_educator.add(c.coach_id)
            c_name = coach_map.get(c.coach_id, "Coach")
            st_count = len(c.student_ids or [])
            if c_name not in coach_student_breakdown:
                coach_student_breakdown[c_name] = {"coach_name": c_name, "total_students": 0, "classes": []}
            coach_student_breakdown[c_name]["total_students"] += st_count
            coach_student_breakdown[c_name]["classes"].append({"class_name": c.name, "students": st_count})

    # Best score strictly from learners
    learner_scores = [l.avg_score for l in learners if l.avg_score]
    best_learner_score = max(learner_scores) if learner_scores else 0.0

    return {
        "platform_statistics": {
            "total_educators": len(educators),
            "total_coaches": len(coaches),
            "coaches_under_educator": len(coaches_under_educator),
            "total_students": len(learners),
            "total_classes": len(classrooms),
            "total_users": len(all_users),
            "best_learner_score": best_learner_score,
        },
        "coach_student_breakdown": list(coach_student_breakdown.values()),
        "user_role_distribution": {
            "educator": len(educators),
            "coach": len(coaches),
            "learner": len(learners),
            "admin": sum(1 for u in all_users if u.role == "admin"),
        },
        "top_performers": sorted(
            [
                {"id": l.id, "name": l.full_name, "score": l.avg_score, "sessions": l.total_sessions}
                for l in learners if l.avg_score
            ],
            key=lambda x: -x["score"]
        )[:10],
        "users": [
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "role": u.role,
                "avg_score": u.avg_score or 0.0,
                "total_sessions": u.total_sessions or 0,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in all_users
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
