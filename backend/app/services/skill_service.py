from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.timezone import to_utc_iso
from app.models.argument_analysis import ArgumentAnalysis
from app.models.debate import DebateArgument, DebateParticipant
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.skill import Skill
from app.services.notification_service import notify_skill_milestone


def _extract_scores_map(raw_scores: list | dict | None) -> dict[str, float]:
    """Helper to normalize scores from ArgumentAnalysis whether stored as dict or list of dicts."""
    if not raw_scores:
        return {}
    if isinstance(raw_scores, dict):
        return {str(k): float(v) for k, v in raw_scores.items() if isinstance(v, (int, float))}
    if isinstance(raw_scores, list):
        res: dict[str, float] = {}
        for item in raw_scores:
            if isinstance(item, dict) and "criterion" in item and "score" in item:
                val = item["score"]
                if isinstance(val, (int, float)):
                    res[str(item["criterion"])] = float(val)
        return res
    return {}


def calculate_user_skills(database: Session, user_id: int) -> dict[str, Any]:
    """
    Calculate performance-based competencies strictly from completed, verified assessments.
    No fabricated scores, artificial baselines, or random numbers.
    Unassessed competencies return None.
    """
    coaching_records = (
        database.query(DebateCoachingRecord)
        .filter(DebateCoachingRecord.user_id == user_id)
        .order_by(DebateCoachingRecord.created_at.desc())
        .all()
    )
    user_arguments = (
        database.query(DebateArgument)
        .filter(DebateArgument.user_id == user_id, DebateArgument.is_ai.is_(False))
        .all()
    )
    argument_analyses = (
        database.query(ArgumentAnalysis)
        .filter(ArgumentAnalysis.user_id == user_id, ArgumentAnalysis.status == "completed")
        .order_by(ArgumentAnalysis.created_at.desc())
        .all()
    )
    presentation_records = (
        database.query(PresentationAnalysis)
        .filter(PresentationAnalysis.user_id == user_id, PresentationAnalysis.status == "completed")
        .order_by(PresentationAnalysis.created_at.desc())
        .all()
    )
    debates_participated = (
        database.query(DebateParticipant)
        .filter(DebateParticipant.user_id == user_id, DebateParticipant.is_ai.is_(False))
        .count()
    )

    comm_points: list[float] = []
    crit_points: list[float] = []
    arg_points: list[float] = []
    conf_points: list[float] = []
    pres_points: list[float] = []

    # 1. From Debate Coaching Records (evaluated argument turns and rubrics)
    for cr in coaching_records:
        cat_scores = cr.category_scores if isinstance(cr.category_scores, dict) else {}

        # Communication clarity
        comm_data = cat_scores.get("communication_clarity")
        if isinstance(comm_data, dict) and isinstance(comm_data.get("score"), (int, float)):
            comm_points.append(float(comm_data["score"]))

        # Logical consistency
        logic_data = cat_scores.get("logical_consistency")
        if isinstance(logic_data, dict) and isinstance(logic_data.get("score"), (int, float)):
            crit_points.append(float(logic_data["score"]))

        # Evidence usage
        ev_data = cat_scores.get("evidence_usage")
        if isinstance(ev_data, dict) and isinstance(ev_data.get("score"), (int, float)):
            crit_points.append(float(ev_data["score"]))

        # Argument quality
        arg_data = cat_scores.get("argument_quality")
        if isinstance(arg_data, dict) and isinstance(arg_data.get("score"), (int, float)):
            arg_points.append(float(arg_data["score"]))

        # Rebuttal effectiveness
        reb_data = cat_scores.get("rebuttal_effectiveness")
        if isinstance(reb_data, dict) and isinstance(reb_data.get("score"), (int, float)):
            arg_points.append(float(reb_data["score"]))

        if cr.overall_score is not None:
            arg_points.append(float(cr.overall_score))

    # 2. From Completed Argument Analyses
    for aa in argument_analyses:
        sc = _extract_scores_map(aa.scores)

        # Communication & clarity
        if "clarity" in sc:
            comm_points.append(sc["clarity"])

        # Critical thinking: logical consistency, evidence strength, fallacy penalty
        has_crit = False
        if "logical_consistency" in sc:
            score_val = sc["logical_consistency"]
            fallacies = aa.detected_fallacies or []
            if isinstance(fallacies, list) and fallacies:
                penalty = min(25.0, len(fallacies) * 8.0)
                score_val = max(10.0, score_val - penalty)
            crit_points.append(score_val)
            has_crit = True

        if "evidence_strength" in sc:
            crit_points.append(sc["evidence_strength"])
            has_crit = True

        if not has_crit and aa.overall_score is not None:
            crit_points.append(float(aa.overall_score))

        # Argumentation: persuasiveness & argument strength
        if "persuasiveness" in sc:
            arg_points.append(sc["persuasiveness"])
        if "evidence_strength" in sc:
            arg_points.append(sc["evidence_strength"])
        if "clarity" not in sc and "persuasiveness" not in sc and aa.overall_score is not None:
            arg_points.append(float(aa.overall_score))

    # 3. From Completed Presentation Evaluations
    for pa in presentation_records:
        res = pa.analysis_result if isinstance(pa.analysis_result, dict) else {}

        # Communication & Diction
        if isinstance(res.get("clarity_score"), (int, float)):
            comm_points.append(float(res["clarity_score"]))

        if pa.filler_word_count is not None and pa.word_count and pa.word_count > 0:
            ratio = pa.filler_word_count / pa.word_count
            if ratio <= 0.02:
                comm_points.append(95.0)
            elif ratio <= 0.04:
                comm_points.append(85.0)
            elif ratio <= 0.07:
                comm_points.append(70.0)
            else:
                comm_points.append(max(40.0, 100.0 - ratio * 800.0))

        # Speaking Confidence (Only from completed speech recordings)
        if isinstance(res.get("confidence_score"), (int, float)):
            conf_points.append(float(res["confidence_score"]))

        if pa.speaking_rate_wpm is not None and pa.speaking_rate_wpm > 0:
            wpm = pa.speaking_rate_wpm
            if 125 <= wpm <= 165:
                conf_points.append(95.0)
            elif (105 <= wpm < 125) or (165 < wpm <= 185):
                conf_points.append(80.0)
            elif (85 <= wpm < 105) or (185 < wpm <= 205):
                conf_points.append(65.0)
            else:
                conf_points.append(50.0)

        # Presentation Delivery (Only from completed speech presentations)
        if isinstance(res.get("overall_score"), (int, float)):
            pres_points.append(float(res["overall_score"]))
        if isinstance(res.get("engagement_score"), (int, float)):
            pres_points.append(float(res["engagement_score"]))
        if isinstance(res.get("clarity_score"), (int, float)):
            pres_points.append(float(res["clarity_score"]))

    def _mean_or_none(vals: list[float]) -> int | None:
        if not vals:
            return None
        return max(0, min(100, round(sum(vals) / len(vals))))

    final_comm = _mean_or_none(comm_points)
    final_crit = _mean_or_none(crit_points)
    final_arg = _mean_or_none(arg_points)
    final_conf = _mean_or_none(conf_points)
    final_pres = _mean_or_none(pres_points)

    has_activity = any([
        final_comm is not None,
        final_crit is not None,
        final_arg is not None,
        final_conf is not None,
        final_pres is not None,
    ])

    return {
        "has_activity": has_activity,
        "total_activities": len(user_arguments) + len(argument_analyses) + len(presentation_records),
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
            "data_points": {
                "communication": len(comm_points),
                "critical_thinking": len(crit_points),
                "argumentation": len(arg_points),
                "confidence": len(conf_points),
                "presentation": len(pres_points),
            },
            "last_activity": to_utc_iso(datetime.now(timezone.utc)) if has_activity else None,
            "explanations": {
                "communication": (
                    f"Calculated from {len(comm_points)} verified performance evaluation(s) across speech clarity and debate diction."
                    if comm_points else
                    "No speech evaluations or debate coaching records available yet. Complete a speech recording or coaching session to receive an assessment."
                ),
                "critical_thinking": (
                    f"Calculated from {len(crit_points)} verified evaluation(s) across argument reasoning, fallacy detection, and logical consistency."
                    if crit_points else
                    "No argument analyses or logical consistency evaluations available yet. Analyze an argument in Argument Studio to receive an assessment."
                ),
                "argumentation": (
                    f"Calculated from {len(arg_points)} verified evaluation(s) across argument claim strength, evidence quality, and rebuttal effectiveness."
                    if arg_points else
                    "No debate coaching or argument evaluations available yet. Complete an AI debate session to receive an assessment."
                ),
                "confidence": (
                    f"Calculated from {len(conf_points)} verified audio speech metric(s) including vocal cadence, fluency, and assertiveness."
                    if conf_points else
                    "No speech recordings evaluated yet. Complete a speech recording to receive your first assessment."
                ),
                "presentation": (
                    f"Calculated from {len(pres_points)} verified presentation evaluation(s) across structure, pacing, and audience engagement."
                    if pres_points else
                    "No presentation submissions evaluated yet. Upload or record a presentation to receive delivery analytics."
                ),
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
        old_score = getattr(skill, field, None)
        setattr(skill, field, new_score)
        if new_score is not None and new_score >= 70 and (old_score is None or old_score < 70):
            try:
                notify_skill_milestone(database, user_id, field, new_score)
            except Exception:
                pass

    database.commit()
    database.refresh(skill)
    return skill
