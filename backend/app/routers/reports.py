from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.debate import DebateArgument, DebateParticipant, DebateSession
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.skill import Skill
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.debate_service import get_debate_or_none, get_participant
from app.services.report_export_service import create_excel_xml, create_pdf


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/debate/{debate_id}/export")
def export_debate_report(
    debate_id: int,
    format: Literal["pdf", "excel", "json"] = Query(default="pdf"),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")

    is_participant = get_participant(database, debate_id, current_user.id) is not None
    is_creator = debate.created_by == current_user.id
    is_elevated = current_user.role in {"administrator", "educator", "debate_coach"}

    if not (is_participant or is_creator or is_elevated):
        raise HTTPException(status_code=403, detail="Access denied to this debate report")

    arguments = (
        database.query(DebateArgument)
        .filter(DebateArgument.debate_id == debate_id)
        .order_by(DebateArgument.turn_order.asc())
        .all()
    )

    coaching_records = (
        database.query(DebateCoachingRecord)
        .filter(DebateCoachingRecord.debate_id == debate_id)
        .order_by(DebateCoachingRecord.created_at.desc())
        .all()
    )

    if format == "json":
        return {
            "debate": {
                "id": debate.id,
                "topic": debate.topic,
                "format": debate.format,
                "status": debate.status,
                "created_at": debate.created_at.isoformat() if debate.created_at else None,
            },
            "arguments": [
                {
                    "turn_order": a.turn_order,
                    "author": a.author_name,
                    "position": a.position,
                    "content": a.content,
                    "is_ai": a.is_ai,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in arguments
            ],
            "coaching_records": [
                {
                    "id": c.id,
                    "overall_score": c.overall_score,
                    "category_scores": c.category_scores,
                    "strengths": c.strengths,
                    "weaknesses": c.weaknesses,
                    "improvement_suggestions": c.improvement_suggestions,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
                for c in coaching_records
            ],
        }

    if format == "excel":
        headers = ["Turn", "Speaker", "Position", "Argument Content", "Timestamp"]
        rows = [
            [
                a.turn_order,
                a.author_name,
                a.position,
                a.content,
                a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
            ]
            for a in arguments
        ]
        xml_content = create_excel_xml(f"Debate_{debate.id}", headers, rows)
        return Response(
            content=xml_content,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="debate-{debate_id}-report.xls"'},
        )

    # PDF format
    sections = [
        ("Debate Information", [
            f"Topic: {debate.topic}",
            f"Format: {debate.format.replace('_', ' ').capitalize()}",
            f"Status: {debate.status.capitalize()}",
            f"Created At: {debate.created_at.strftime('%B %d, %Y') if debate.created_at else 'N/A'}",
            f"Total Arguments: {len(arguments)}",
        ]),
    ]

    arg_lines = []
    for a in arguments:
        arg_lines.append(f"Turn {a.turn_order} - {a.author_name} ({a.position}):")
        arg_lines.append(f"  {a.content}")
    sections.append(("Debate Transcript", arg_lines if arg_lines else ["No arguments recorded yet."]))

    if coaching_records:
        latest = coaching_records[0]
        coaching_lines = [
            f"Overall Coaching Score: {latest.overall_score or 'Incomplete'}/100",
            f"Assessment: {latest.overall_assessment}",
            "",
            "Category Score Breakdown:",
        ]
        if isinstance(latest.category_scores, dict):
            for cat, data in latest.category_scores.items():
                sc = data.get("score") if isinstance(data, dict) else None
                coaching_lines.append(f"  • {cat.replace('_', ' ').capitalize()}: {sc if sc is not None else 'N/A'}/100")
        if latest.strengths:
            coaching_lines.append("")
            coaching_lines.append("Key Strengths:")
            for s in latest.strengths:
                for sub in str(s).split(";"):
                    if sub.strip():
                        coaching_lines.append(f"  • {sub.strip()}")
        if latest.weaknesses:
            coaching_lines.append("")
            coaching_lines.append("Areas to Improve:")
            for w in latest.weaknesses:
                for sub in str(w).split(";"):
                    if sub.strip():
                        coaching_lines.append(f"  • {sub.strip()}")
        if latest.improvement_suggestions:
            coaching_lines.append("")
            coaching_lines.append("Actionable Next Steps:")
            for sug in latest.improvement_suggestions:
                for sub in str(sug).split(";"):
                    if sub.strip():
                        coaching_lines.append(f"  • {sub.strip()}")
        sections.append(("Coaching Evaluation", coaching_lines))

    pdf_bytes = create_pdf(f"Debate Session Report #{debate.id}", sections)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="debate-{debate_id}-report.pdf"'},
    )


@router.get("/presentation/{presentation_id}/export")
def export_presentation_report(
    presentation_id: int,
    format: Literal["pdf", "excel", "json"] = Query(default="pdf"),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    pres = database.get(PresentationAnalysis, presentation_id)
    if pres is None:
        raise HTTPException(status_code=404, detail="Presentation analysis not found")

    is_owner = pres.user_id == current_user.id
    is_elevated = current_user.role in {"administrator", "educator", "debate_coach"}
    if not (is_owner or is_elevated):
        raise HTTPException(status_code=403, detail="Access denied")

    res = pres.analysis_result or {}

    if format == "json":
        return {
            "id": pres.id,
            "filename": pres.display_filename,
            "status": pres.status,
            "word_count": pres.word_count,
            "filler_word_count": pres.filler_word_count,
            "duration_seconds": pres.duration_seconds,
            "speaking_rate_wpm": pres.speaking_rate_wpm,
            "confidence_score": res.get("confidence_score"),
            "clarity_score": res.get("clarity_score"),
            "engagement_score": res.get("engagement_score"),
            "overall_score": res.get("overall_score"),
            "transcript": pres.transcript,
            "analysis": res,
        }

    if format == "excel":
        headers = ["Metric", "Value", "Description"]
        rows = [
            ["Display Filename", pres.display_filename, "Original submitted filename"],
            ["Status", pres.status, "Processing completion status"],
            ["Total Word Count", pres.word_count, "Calculated words in transcript"],
            ["Filler Word Count", pres.filler_word_count, "Identified vocal disfluencies"],
            ["Duration (Seconds)", pres.duration_seconds, "Recorded audio duration"],
            ["Speaking Rate (WPM)", pres.speaking_rate_wpm, "Words per minute pace"],
            ["Confidence Score", res.get("confidence_score", "N/A"), "Speech confidence assessment"],
            ["Clarity Score", res.get("clarity_score", "N/A"), "Message clarity and diction score"],
            ["Engagement Score", res.get("engagement_score", "N/A"), "Audience engagement score"],
            ["Overall Score", res.get("overall_score", "N/A"), "Composite presentation evaluation"],
        ]
        xml_content = create_excel_xml(f"Presentation_{pres.id}", headers, rows)
        return Response(
            content=xml_content,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="presentation-{presentation_id}-report.xls"'},
        )

    # PDF format
    sections = [
        ("Presentation Metadata", [
            f"File: {pres.display_filename}",
            f"Type: {pres.submission_type.capitalize()}",
            f"Status: {pres.status.capitalize()}",
            f"Submitted: {pres.created_at.strftime('%B %d, %Y %H:%M') if pres.created_at else 'N/A'}",
        ]),
        ("Presentation Analytics & Metrics", [
            f"Speaking Rate: {pres.speaking_rate_wpm or 'N/A'} WPM (Target: 130-160 WPM)",
            f"Word Count: {pres.word_count or 0} words",
            f"Filler Words: {pres.filler_word_count or 0}",
            f"Confidence Score: {res.get('confidence_score', 'N/A')}/100",
            f"Clarity Score: {res.get('clarity_score', 'N/A')}/100",
            f"Audience Engagement Score: {res.get('engagement_score', 'N/A')}/100",
            f"Overall Automated Estimate: {res.get('overall_score', 'N/A')}/100",
        ]),
        ("Transcript", [pres.transcript[:1500] if pres.transcript else "No transcript available."]),
    ]

    if res.get("strengths"):
        sections.append(("Strengths", res["strengths"]))
    if res.get("improvement_areas"):
        sections.append(("Areas for Improvement", res["improvement_areas"]))
    if res.get("recommendations"):
        sections.append(("Actionable Recommendations", res["recommendations"]))

    pdf_bytes = create_pdf(f"Presentation Analysis Report #{pres.id}", sections)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="presentation-{presentation_id}-report.pdf"'},
    )


@router.get("/learner/progress")
def export_learner_progress_report(
    user_id: int | None = Query(default=None),
    format: Literal["pdf", "excel", "json"] = Query(default="pdf"),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    target_id = user_id if (user_id and current_user.role in {"administrator", "educator"}) else current_user.id
    target_user = database.get(User, target_id)
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    skill = database.query(Skill).filter(Skill.user_id == target_id).first()
    debates_count = database.query(DebateParticipant).filter(DebateParticipant.user_id == target_id).count()
    args_count = database.query(DebateArgument).filter(DebateArgument.user_id == target_id, DebateArgument.is_ai.is_(False)).count()
    pres_count = database.query(PresentationAnalysis).filter(PresentationAnalysis.user_id == target_id).count()

    skills_data = {
        "Communication": skill.communication_score if skill else 0,
        "Critical Thinking": skill.critical_thinking_score if skill else 0,
        "Argumentation": skill.argumentation_score if skill else 0,
        "Confidence": skill.confidence_score if skill else 0,
        "Presentation": skill.presentation_score if skill else 0,
    }

    if format == "json":
        return {
            "user": {"id": target_user.id, "name": target_user.name, "email": target_user.email, "role": target_user.role},
            "activity": {"debates": debates_count, "arguments": args_count, "presentations": pres_count},
            "skills": skills_data,
        }

    if format == "excel":
        headers = ["Skill Domain", "Current Score", "Proficiency Status"]
        rows = [
            [name, val, "Proficient" if val >= 75 else ("Developing" if val >= 50 else "Needs Practice")]
            for name, val in skills_data.items()
        ]
        xml_content = create_excel_xml(f"Progress_{target_user.name}", headers, rows)
        return Response(
            content=xml_content,
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="learner-{target_id}-progress.xls"'},
        )

    # PDF format
    sections = [
        ("Learner Overview", [
            f"Name: {target_user.name}",
            f"Email: {target_user.email}",
            f"Role: {target_user.role.capitalize()}",
            f"Debates Joined: {debates_count}",
            f"Arguments Submitted: {args_count}",
            f"Presentations Analyzed: {pres_count}",
        ]),
        ("Core Competency Baseline", [
            f"{name}: {val}/100 ({'Proficient' if val >= 75 else ('Developing' if val >= 50 else 'Needs Focus')})"
            for name, val in skills_data.items()
        ]),
        ("Coaching Summary", [
            "Consistent practice in multi-turn debate simulation and presentation analysis",
            "demonstrably correlates with accelerated critical reasoning and confidence gains.",
        ]),
    ]

    pdf_bytes = create_pdf(f"Learning Progress Report - {target_user.name}", sections)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="learner-{target_id}-progress.pdf"'},
    )
