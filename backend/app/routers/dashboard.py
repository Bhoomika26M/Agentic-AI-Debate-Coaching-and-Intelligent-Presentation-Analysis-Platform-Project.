from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.timezone import format_ist, format_ist_date, to_utc_iso
from app.models.debate import DebateArgument, DebateParticipant, DebateSession
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.skill import Skill
from app.models.user import User
from app.schemas.dashboard import (
    AdminDashboardData,
    CoachDashboardData,
    DashboardOverviewResponse,
    EducatorDashboardData,
    LearnerDashboardData,
)
from app.services.auth_service import get_current_user
from app.services.llm_service import llm_service


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    view: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    requested_view = view or current_user.role

    # Permission check: users cannot view higher-privileged dashboards
    if requested_view == "administrator" and current_user.role != "administrator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator permissions required")
    if requested_view == "educator" and current_user.role not in {"administrator", "educator"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Educator permissions required")
    if requested_view == "debate_coach" and current_user.role not in {"administrator", "debate_coach"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Debate Coach permissions required")

    response = DashboardOverviewResponse(
        active_role=requested_view,
        user_role=current_user.role,
    )

    # 1. Learner Dashboard Data
    if requested_view == "learner":
        user_part_ids = [
            p.debate_id
            for p in database.query(DebateParticipant.debate_id).filter(DebateParticipant.user_id == current_user.id).all()
        ]
        user_debates = (
            database.query(DebateSession)
            .filter(
                (DebateSession.created_by == current_user.id)
                | (DebateSession.id.in_(user_part_ids))
            )
            .order_by(DebateSession.created_at.desc())
            .all()
        )
        total_debates = len(user_debates)

        total_args = (
            database.query(DebateArgument)
            .filter(DebateArgument.user_id == current_user.id, DebateArgument.is_ai.is_(False))
            .count()
        )

        presentations = (
            database.query(PresentationAnalysis)
            .filter(PresentationAnalysis.user_id == current_user.id)
            .order_by(PresentationAnalysis.created_at.desc())
            .all()
        )
        total_presentations = len(presentations)

        coaching_records = (
            database.query(DebateCoachingRecord)
            .filter(DebateCoachingRecord.user_id == current_user.id)
            .order_by(DebateCoachingRecord.created_at.desc())
            .all()
        )
        debate_scores = [r.overall_score for r in coaching_records if r.overall_score is not None]
        avg_debate_score = round(sum(debate_scores) / len(debate_scores), 2) if debate_scores else None

        pres_scores = [
            r.analysis_result.get("overall_score")
            for r in presentations
            if r.status == "completed"
            and isinstance(r.analysis_result, dict)
            and isinstance(r.analysis_result.get("overall_score"), (int, float))
        ]
        avg_pres_score = round(sum(pres_scores) / len(pres_scores), 2) if pres_scores else None

        from app.services.skill_service import calculate_user_skills, sync_user_skills
        calc = calculate_user_skills(database, current_user.id)
        if calc["has_activity"]:
            skill = sync_user_skills(database, current_user.id)
        else:
            skill = database.query(Skill).filter(Skill.user_id == current_user.id).first()

        skills_dict = {
            "communication": skill.communication_score if skill else None,
            "critical_thinking": skill.critical_thinking_score if skill else None,
            "argumentation": skill.argumentation_score if skill else None,
            "confidence": skill.confidence_score if skill else None,
            "presentation": skill.presentation_score if skill else None,
        }

        # Improvement trends over time
        trends = []
        for rec in reversed(coaching_records[:10]):
            trends.append({
                "date": format_ist(rec.created_at, "%b %d"),
                "type": "Debate",
                "score": rec.overall_score,
                "detail": f"{rec.source_argument_count} arguments",
            })
        for pres in reversed(presentations[:10]):
            if pres.status == "completed" and isinstance(pres.analysis_result, dict):
                score = pres.analysis_result.get("overall_score")
                if score is not None:
                    trends.append({
                        "date": format_ist(pres.created_at, "%b %d"),
                        "type": "Presentation",
                        "score": score,
                        "detail": pres.display_filename,
                    })

        recent_debates_data = [
            {
                "id": d.id,
                "topic": d.topic,
                "format": d.format,
                "status": d.status,
                "created_at": to_utc_iso(d.created_at) or "",
            }
            for d in user_debates[:5]
        ]

        recent_pres_data = [
            {
                "id": p.id,
                "filename": p.display_filename,
                "status": p.status,
                "score": p.analysis_result.get("overall_score") if isinstance(p.analysis_result, dict) else None,
                "created_at": to_utc_iso(p.created_at) or "",
            }
            for p in presentations[:5]
        ]

        recommended = [
            "Practice structuring thesis statements in the Argument Analysis tool.",
            "Complete a 3-turn multi-round debate with the AI opponent on a policy topic.",
            "Record a 2-minute speech and check your speaking rate and filler words.",
        ]

        insights = [
            f"You have participated in {total_debates} debate sessions and submitted {total_args} arguments.",
            f"Your current argumentation baseline is {skills_dict['argumentation']}/100.",
        ]
        if avg_debate_score:
            insights.append(f"Your average debate coaching score across evaluated sessions is {avg_debate_score}/100.")

        response.learner_data = LearnerDashboardData(
            total_debates=total_debates,
            total_arguments=total_args,
            total_presentations=total_presentations,
            average_debate_score=avg_debate_score,
            average_presentation_score=avg_pres_score,
            skills=skills_dict,
            improvement_trends=trends,
            recent_debates=recent_debates_data,
            recent_presentations=recent_pres_data,
            recommended_exercises=recommended,
            coaching_insights=insights,
        )

    # 2. Debate Coach Dashboard Data
    elif requested_view == "debate_coach":
        learners = database.query(User).filter(User.role == "learner").all()
        evaluations = (
            database.query(DebateCoachingRecord)
            .order_by(DebateCoachingRecord.created_at.desc())
            .limit(10)
            .all()
        )

        students_summary = []
        for learner in learners:
            args = database.query(DebateArgument).filter(DebateArgument.user_id == learner.id).count()
            l_debates = database.query(DebateParticipant).filter(DebateParticipant.user_id == learner.id).count()
            records = database.query(DebateCoachingRecord).filter(DebateCoachingRecord.user_id == learner.id).all()
            scores = [r.overall_score for r in records if r.overall_score is not None]
            avg = round(sum(scores) / len(scores), 2) if scores else None
            students_summary.append({
                "id": learner.id,
                "name": learner.name,
                "email": learner.email,
                "debates_joined": l_debates,
                "arguments_submitted": args,
                "average_score": avg,
            })

        recent_evals = []
        for eval_rec in evaluations:
            student = database.get(User, eval_rec.user_id)
            debate = database.get(DebateSession, eval_rec.debate_id)
            recent_evals.append({
                "id": eval_rec.id,
                "student_name": student.name if student else "Unknown",
                "debate_topic": debate.topic if debate else "Debate",
                "overall_score": eval_rec.overall_score,
                "arguments_evaluated": eval_rec.source_argument_count,
                "created_at": format_ist(eval_rec.created_at, "%b %d, %Y %I:%M %p"),
            })

        skill_gaps = [
            {"skill": "Evidence Usage", "frequency": "Common", "recommendation": "Encourage students to provide specific source citations and empirical warrants."},
            {"skill": "Rebuttal Effectiveness", "frequency": "Frequent", "recommendation": "Instruct debaters to directly quote opposing premises before responding."},
            {"skill": "Logical Consistency", "frequency": "Moderate", "recommendation": "Review common fallacies such as False Dilemma and Slippery Slope."},
        ]

        coach_recs = [
            "Assign students to practice with specific debate formats (Parliamentary, Oxford) to build structure.",
            "Encourage multi-turn engagements; debaters improve significantly between turns 3 and 5.",
            "Review student presentation pacing reports: 130–160 WPM is ideal for persuasive cadence.",
        ]

        response.coach_data = CoachDashboardData(
            total_students=len(learners),
            total_debates_evaluated=database.query(DebateCoachingRecord).count(),
            students_overview=students_summary,
            recent_evaluations=recent_evals,
            skill_gap_summary=skill_gaps,
            coaching_recommendations=coach_recs,
        )

    # 3. Educator Dashboard Data
    elif requested_view == "educator":
        all_students = database.query(User).filter(User.role.in_(["learner", "debate_coach"])).all()
        rankings = []
        all_scores = []
        for student in all_students:
            c_records = database.query(DebateCoachingRecord).filter(DebateCoachingRecord.user_id == student.id).all()
            p_records = database.query(PresentationAnalysis).filter(PresentationAnalysis.user_id == student.id, PresentationAnalysis.status == "completed").all()
            scores = [r.overall_score for r in c_records if r.overall_score is not None]
            for p in p_records:
                if isinstance(p.analysis_result, dict) and isinstance(p.analysis_result.get("overall_score"), (int, float)):
                    scores.append(p.analysis_result["overall_score"])
            avg = round(sum(scores) / len(scores), 2) if scores else None
            if avg is not None:
                all_scores.append(avg)
            rankings.append({
                "user_id": student.id,
                "name": student.name,
                "email": student.email,
                "debates_count": database.query(DebateParticipant).filter(DebateParticipant.user_id == student.id).count(),
                "presentations_count": len(p_records),
                "composite_score": avg or 0,
            })

        rankings.sort(key=lambda x: x["composite_score"], reverse=True)
        for i, item in enumerate(rankings):
            item["rank"] = i + 1

        recent_debates = database.query(DebateSession).order_by(DebateSession.created_at.desc()).limit(10).all()
        debate_reports = [
            {
                "id": d.id,
                "topic": d.topic,
                "format": d.format,
                "status": d.status,
                "arguments_count": database.query(DebateArgument).filter(DebateArgument.debate_id == d.id).count(),
                "participants_count": database.query(DebateParticipant).filter(DebateParticipant.debate_id == d.id).count(),
                "created_at": format_ist_date(d.created_at, "%b %d, %Y"),
            }
            for d in recent_debates
        ]

        pres_submissions = database.query(PresentationAnalysis).order_by(PresentationAnalysis.created_at.desc()).limit(10).all()
        pres_reports = [
            {
                "id": p.id,
                "filename": p.display_filename,
                "user_id": p.user_id,
                "status": p.status,
                "overall_score": p.analysis_result.get("overall_score") if isinstance(p.analysis_result, dict) else None,
                "created_at": format_ist_date(p.created_at, "%b %d, %Y"),
            }
            for p in pres_submissions
        ]

        response.educator_data = EducatorDashboardData(
            class_size=len(all_students),
            class_average_score=round(sum(all_scores) / len(all_scores), 2) if all_scores else None,
            student_rankings=rankings,
            debate_performance_reports=debate_reports,
            presentation_assessment_reports=pres_reports,
        )

    # 4. Administrator Dashboard Data
    elif requested_view == "administrator":
        users = database.query(User).all()
        total_debates = database.query(DebateSession).count()
        total_args = database.query(DebateArgument).count()
        total_presentations = database.query(PresentationAnalysis).count()
        total_coaching = database.query(DebateCoachingRecord).count()

        analytics = {
            "total_users": len(users),
            "learners": sum(1 for u in users if u.role == "learner"),
            "debate_coaches": sum(1 for u in users if u.role == "debate_coach"),
            "educators": sum(1 for u in users if u.role == "educator"),
            "administrators": sum(1 for u in users if u.role == "administrator"),
            "total_debates": total_debates,
            "total_arguments": total_args,
            "total_presentations": total_presentations,
            "total_coaching_records": total_coaching,
        }

        ai_monitoring = {
            "configured_provider": settings.llm_provider,
            "provider_available": llm_service.is_available(),
            "model_name": settings.openai_model,
            "transcription_model": settings.openai_transcription_model,
            "timeout_seconds": settings.llm_timeout_seconds,
            "max_context_messages": settings.llm_max_context_messages,
            "status": "Operational" if llm_service.is_available() else "Disabled (Offline Simulation Mode active)",
        }

        system_reports = {
            "database_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
            "database_engine": "SQLite" if settings.database_url.startswith("sqlite") else "PostgreSQL",
            "environment": settings.environment,
            "email_backend": settings.email_backend,
            "upload_max_bytes": settings.presentation_max_upload_bytes,
            "server_time_utc": datetime.now(timezone.utc).isoformat(),
            "server_time_ist": format_ist(datetime.now(timezone.utc)),
        }

        recent_users_list = [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "created_at": format_ist_date(u.created_at, "%b %d, %Y"),
            }
            for u in sorted(users, key=lambda x: x.created_at or datetime.min, reverse=True)[:15]
        ]

        response.admin_data = AdminDashboardData(
            platform_analytics=analytics,
            ai_model_monitoring=ai_monitoring,
            system_reports=system_reports,
            recent_users=recent_users_list,
        )

    return response
