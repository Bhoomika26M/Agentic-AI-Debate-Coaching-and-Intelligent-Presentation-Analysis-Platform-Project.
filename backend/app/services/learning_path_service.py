from sqlalchemy.orm import Session

from app.models.debate import DebateArgument, DebateSession
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.profile import Profile
from app.models.skill import Skill
from app.schemas.learning_path import LearningPathPhase, LearningPathResponse


def generate_user_learning_path(database: Session, user_id: int) -> LearningPathResponse:
    skill = database.query(Skill).filter(Skill.user_id == user_id).first()
    profile = database.query(Profile).filter(Profile.user_id == user_id).first()
    debate_count = database.query(DebateSession).filter(DebateSession.created_by == user_id).count()
    arg_count = database.query(DebateArgument).filter(DebateArgument.user_id == user_id, DebateArgument.is_ai.is_(False)).count()
    presentation_count = database.query(PresentationAnalysis).filter(PresentationAnalysis.user_id == user_id, PresentationAnalysis.status == "completed").count()

    scores = {
        "communication": skill.communication_score if skill else 0,
        "critical_thinking": skill.critical_thinking_score if skill else 0,
        "argumentation": skill.argumentation_score if skill else 0,
        "confidence": skill.confidence_score if skill else 0,
        "presentation": skill.presentation_score if skill else 0,
    }

    avg_score = sum(scores.values()) / max(len(scores), 1)

    skill_gaps = []
    target = 75
    for skill_name, val in scores.items():
        gap = target - val
        status = "proficient" if val >= target else ("moderate_gap" if val >= 50 else "priority_gap")
        skill_gaps.append({
            "skill": skill_name,
            "current_score": val,
            "target_score": target,
            "gap": max(0, gap),
            "status": status,
        })

    experience = (profile.experience_level if profile and profile.experience_level else "beginner").lower()

    # Determine progression
    phase1_done = arg_count >= 2 or scores["argumentation"] >= 60
    phase2_done = phase1_done and (arg_count >= 5 or scores["critical_thinking"] >= 65)
    phase3_done = phase2_done and (debate_count >= 3 or scores["communication"] >= 70)
    phase4_done = phase3_done and (presentation_count >= 2 or scores["presentation"] >= 75)

    phases = [
        LearningPathPhase(
            phase=1,
            title="Core Argument Architecture & Claim Stating",
            focus_skills=["Argumentation", "Clarity"],
            description="Master formulating falsifiable thesis claims, warranting assertions, and eliminating hasty generalizations.",
            recommended_exercises=[
                "Analyze 3 controversial arguments using the Argument Analysis engine.",
                "Complete a One-on-One debate focusing strictly on primary claim validity.",
            ],
            status="completed" if phase1_done else "in_progress",
        ),
        LearningPathPhase(
            phase=2,
            title="Evidence Sourcing & Counterargumentation",
            focus_skills=["Evidence Usage", "Critical Thinking"],
            description="Develop multi-dimensional counterpoints across Logical, Empirical, Ethical, Practical, and Policy vectors.",
            recommended_exercises=[
                "Use the Counterargument Generation Engine on 2 policy topics.",
                "Engage in an Oxford debate defending a counter-intuitive position.",
            ],
            status="completed" if phase2_done else ("in_progress" if phase1_done else "upcoming"),
        ),
        LearningPathPhase(
            phase=3,
            title="Rebuttal Agility & Fallacy Detection",
            focus_skills=["Rebuttal Effectiveness", "Logical Consistency"],
            description="Identify subtle rhetorical fallacies (Ad Hominem, Straw Man, Slippery Slope) under live simulation constraints.",
            recommended_exercises=[
                "Run a multi-turn AI Debate Simulation with at least 4 continuous turns.",
                "Request AI Coach Feedback and achieve >70% on Rebuttal Effectiveness.",
            ],
            status="completed" if phase3_done else ("in_progress" if phase2_done else "upcoming"),
        ),
        LearningPathPhase(
            phase=4,
            title="Presentation Pacing, Modulation & Persuasive Impact",
            focus_skills=["Communication", "Confidence", "Presentation"],
            description="Refine speaking pace (130-160 WPM), minimize filler words (<3%), and elevate audience engagement scores.",
            recommended_exercises=[
                "Upload a 2-minute speech recording to Presentation Analysis.",
                "Review pacing report and aim for zero ungrounded pauses.",
            ],
            status="completed" if phase4_done else ("in_progress" if phase3_done else "upcoming"),
        ),
    ]

    completed_phases = sum(1 for p in phases if p.status == "completed")
    overall_progress = int((completed_phases / len(phases)) * 100)

    insights = [
        f"You have submitted {arg_count} debate arguments and completed {presentation_count} presentation reviews.",
        f"Your highest baseline skill is {max(scores, key=scores.get).replace('_', ' ').capitalize()} ({max(scores.values())}/100).",
        f"Recommended focus: {min(scores, key=scores.get).replace('_', ' ').capitalize()} is currently your largest growth opportunity.",
    ]

    return LearningPathResponse(
        user_id=user_id,
        current_level=experience.capitalize(),
        overall_progress_pct=overall_progress,
        skill_gaps=skill_gaps,
        phases=phases,
        personalized_coaching_insights=insights,
    )
