from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.argument_analysis import ArgumentAnalysis
from app.models.debate import DebateArgument, DebateParticipant
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.skill import Skill
from app.services.notification_service import notify_skill_milestone


def calculate_user_skills(database: Session, user_id: int) -> dict[str, Any]:
    # 1. Fetch user's practice records
    coaching_records = (
        database.query(DebateCoachingRecord)
        .filter(DebateCoachingRecord.user_id == user_id)
        .all()
    )
    user_arguments = (
        database.query(DebateArgument)
        .filter(DebateArgument.user_id == user_id, DebateArgument.is_ai.is_(False))
        .all()
    )
    argument_analyses = (
        database.query(ArgumentAnalysis)
        .filter(ArgumentAnalysis.user_id == user_id)
        .all()
    )
    presentation_records = (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == user_id, PresentationAnalysis.status == "completed")
        .all()
    )

    debates_participated = (
        database.query(DebateParticipant)
        .filter(DebateParticipant.user_id == user_id, DebateParticipant.is_ai.is_(False))
        .count()
    )

    total_activities = len(user_arguments) + len(argument_analyses) + len(presentation_records)

    # If completely new user with no activity
    if total_activities == 0 and len(coaching_records) == 0:
        return {
            "has_activity": False,
            "total_activities": 0,
            "scores": {
                "communication_score": 0,
                "critical_thinking_score": 0,
                "argumentation_score": 0,
                "confidence_score": 0,
                "presentation_score": 0,
            },
            "provenance": {
                "debates_count": debates_participated,
                "arguments_count": 0,
                "analyses_count": 0,
                "presentations_count": 0,
                "coaching_reviews_count": 0,
                "last_activity": None,
                "explanations": {
                    "communication": "No speech or debate activity recorded yet. Practice debates or record presentations to build this score.",
                    "critical_thinking": "No argument analyses or debate evaluations completed yet.",
                    "argumentation": "No debate arguments submitted yet.",
                    "confidence": "No presentations delivered yet.",
                    "presentation": "No speech recordings evaluated yet.",
                },
            },
        }

    # Extract score metrics
    comm_points: list[float] = []
    crit_points: list[float] = []
    arg_points: list[float] = []
    conf_points: list[float] = []
    pres_points: list[float] = []

    # 1. From Debate Coaching Records
    for cr in coaching_records:
        cat_scores = cr.category_scores or {}
        if isinstance(cat_scores, dict):
            # Communication
            comm_data = cat_scores.get("communication_clarity")
            if isinstance(comm_data, dict) and comm_data.get("score") is not None:
                comm_points.append(float(comm_data["score"]))
            # Critical thinking / logic
            logic_data = cat_scores.get("logical_consistency")
            if isinstance(logic_data, dict) and logic_data.get("score") is not None:
                crit_points.append(float(logic_data["score"]))
            # Argumentation
            arg_data = cat_scores.get("argument_quality")
            if isinstance(arg_data, dict) and arg_data.get("score") is not None:
                arg_points.append(float(arg_data["score"]))
            rebuttal_data = cat_scores.get("rebuttal_effectiveness")
            if isinstance(rebuttal_data, dict) and rebuttal_data.get("score") is not None:
                arg_points.append(float(rebuttal_data["score"]))

    # 2. From Argument Analyses
    for aa in argument_analyses:
        sc = aa.scores or {}
        if isinstance(sc, dict):
            if sc.get("clarity") is not None:
                comm_points.append(float(sc["clarity"]))
            if sc.get("reasoning_quality") is not None:
                crit_points.append(float(sc["reasoning_quality"]))
            if sc.get("argument_strength") is not None:
                arg_points.append(float(sc["argument_strength"]))
            if sc.get("evidence_strength") is not None:
                arg_points.append(float(sc["evidence_strength"]))
        elif aa.overall_score is not None:
            arg_points.append(float(aa.overall_score))

        # Critical thinking fallacy awareness
        fallacies = aa.detected_fallacies or []
        if isinstance(fallacies, list):
            crit_penalty = min(25, len(fallacies) * 8)
            base_crit = float(sc.get("reasoning_quality", 75)) if isinstance(sc, dict) else 75.0
            crit_points.append(max(20.0, base_crit - crit_penalty))

    # 3. From Presentation Analyses
    for pa in presentation_records:
        res = pa.analysis_result or {}
        if isinstance(res, dict):
            if res.get("clarity_score") is not None:
                comm_points.append(float(res["clarity_score"]))
            if res.get("confidence_score") is not None:
                conf_points.append(float(res["confidence_score"]))
            if res.get("engagement_score") is not None:
                pres_points.append(float(res["engagement_score"]))
            if res.get("overall_score") is not None:
                pres_points.append(float(res["overall_score"]))

        # Delivery factors for confidence & communication
        if pa.speaking_rate_wpm is not None:
            wpm = pa.speaking_rate_wpm
            # Optimal speech pace: 130-165 WPM -> 85-95 score
            if 125 <= wpm <= 165:
                conf_points.append(90.0)
            elif 100 <= wpm <= 185:
                conf_points.append(75.0)
            else:
                conf_points.append(60.0)

        if pa.filler_word_count is not None and pa.word_count and pa.word_count > 0:
            filler_ratio = pa.filler_word_count / pa.word_count
            if filler_ratio < 0.02:
                comm_points.append(92.0)
            elif filler_ratio < 0.05:
                comm_points.append(78.0)
            else:
                comm_points.append(62.0)

    # 4. Baseline heuristic credit for active debate turns
    if len(user_arguments) > 0:
        # Debaters active in argument generation develop fundamentals
        active_bonus = min(20.0, len(user_arguments) * 5.0)
        arg_points.append(60.0 + active_bonus)
        comm_points.append(60.0 + active_bonus)
        crit_points.append(60.0 + active_bonus)

    def _safe_mean(vals: list[float], fallback: float = 0.0) -> int:
        if not vals:
            return int(fallback)
        avg = sum(vals) / len(vals)
        return max(0, min(100, round(avg)))

    final_comm = _safe_mean(comm_points)
    final_crit = _safe_mean(crit_points)
    final_arg = _safe_mean(arg_points)
    final_conf = _safe_mean(conf_points, fallback=final_comm * 0.9 if final_comm > 0 else 0.0)
    final_pres = _safe_mean(pres_points, fallback=final_comm * 0.9 if final_comm > 0 else 0.0)

    return {
        "has_activity": True,
        "total_activities": total_activities,
        "scores": {
            "communication_score": final_comm,
            "critical_thinking_score": final_crit,
            "argumentation_score": final_arg,
            "confidence_score": final_conf,
            "presentation_score": final_pres,
        },
        "provenance": {
            "debates_count": debates_participated,
            "arguments_count": len(user_arguments),
            "analyses_count": len(argument_analyses),
            "presentations_count": len(presentation_records),
            "coaching_reviews_count": len(coaching_records),
            "last_activity": datetime.now().isoformat(),
            "explanations": {
                "communication": f"Calculated from {len(comm_points)} data points across debate clarity and presentation delivery metrics.",
                "critical_thinking": f"Calculated from {len(crit_points)} data points across argument reasoning, fallacy detection, and logical consistency.",
                "argumentation": f"Calculated from {len(arg_points)} data points across debate turns, claim structure, and rebuttal assessments.",
                "confidence": f"Calculated from {len(conf_points)} data points including speech fluency, vocal pace, and presentation confidence.",
                "presentation": f"Calculated from {len(pres_points)} speech evaluations and audience engagement ratings.",
            },
        },
    }


def sync_user_skills(database: Session, user_id: int) -> Skill:
    calc = calculate_user_skills(database, user_id)
    scores = calc["scores"]

    skill = database.query(Skill).filter(Skill.user_id == user_id).first()
    if skill is None:
        skill = Skill(user_id=user_id)
        database.add(skill)

    for field, new_score in scores.items():
        old_score = getattr(skill, field, 0)
        setattr(skill, field, new_score)
        if new_score >= 70 and old_score < 70:
            try:
                notify_skill_milestone(database, user_id, field, new_score)
            except Exception:
                pass

    database.commit()
    database.refresh(skill)
    return skill
