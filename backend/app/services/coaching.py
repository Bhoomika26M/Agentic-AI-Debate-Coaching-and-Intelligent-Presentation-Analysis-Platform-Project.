"""
Coaching Recommendation Engine — Milestone 3
Provides:
 - Personalised coaching recommendations based on analysis history
 - Skill gap identification
 - Learning path / study plan generation
 - Performance progress tracking
 - Debate exercises and drills
"""

from typing import Literal
from app.services.ai_agent import ai_agent
from app.services.coaching_data import SKILL_AREAS, WEEKLY_PLANS, DRILL_LIBRARY


class CoachingEngine:

    def generate_recommendations(
        self,
        scores: dict,
        user_level: str = "intermediate",
        focus_areas: list[str] | None = None,
    ) -> dict:
        """
        Generate personalised coaching recommendations via Agentic AI when active.
        scores: dict of {skill_area: score_0_to_100}
        """
        if not scores:
            scores = {k: 60.0 for k in SKILL_AREAS}

        ranked = sorted(scores.items(), key=lambda x: x[1])

        # Attempt Agentic AI coaching synthesis
        if ai_agent.get_status().get("active"):
            try:
                ai_output = ai_agent.generate_coaching_recommendations(
                    scores=scores,
                    user_level=user_level,
                    focus_areas=focus_areas,
                )
                if ai_output and "recommendations" in ai_output:
                    # Normalize recommendations for frontend
                    formatted_recs = []
                    for r in ai_output.get("recommendations", []):
                        formatted_recs.append({
                            "skill": r.get("skill", "Debate Core"),
                            "current_score": scores.get(r.get("skill", "").lower().replace(" ", "_"), 65),
                            "target_score": 85,
                            "priority": r.get("priority", "High").capitalize(),
                            "rationale": r.get("recommendation", "Refine debate technique."),
                            "exercises": [r.get("targeted_exercise", "Daily 2-minute rebuttal practice")],
                            "resources": ["Use peer-reviewed citations and structured contention signposting"],
                        })

                    return {
                        "user_level": user_level,
                        "overall_score": round(sum(scores.values()) / max(len(scores), 1), 1),
                        "weak_areas": [k for k, v in ranked if v <= 65],
                        "strong_areas": [k for k, v in ranked if v >= 80],
                        "primary_focus": [r.get("skill") for r in formatted_recs[:2]],
                        "recommendations": formatted_recs,
                        "primary_recommendations": formatted_recs,
                        "supplementary": [],
                        "overall_assessment": ai_output.get("overall_assessment"),
                        "priority_focus": ai_output.get("priority_focus"),
                        "suggested_topics": ai_output.get("suggested_topics", []),
                        "is_ai_generated": True,
                    }
            except Exception as e:
                pass

        # Identify weak areas (<= 65) and strengths (>= 80)
        weak_areas = [(k, v) for k, v in ranked if v <= 65]
        strong_areas = [(k, v) for k, v in ranked if v >= 80]
        developing_areas = [(k, v) for k, v in ranked if 65 < v < 80]

        # Primary focus: top 2 weakest areas
        primary_focus = [k for k, _ in weak_areas[:2]] or [k for k, _ in developing_areas[:2]]

        recommendations = []
        for skill_key in primary_focus:
            if skill_key in SKILL_AREAS:
                skill = SKILL_AREAS[skill_key]
                score = scores.get(skill_key, 60)
                rec = {
                    "skill": skill["label"],
                    "current_score": round(score, 1),
                    "target_score": min(score + 20, 95),
                    "priority": "High" if score <= 50 else "Medium",
                    "rationale": f"Your {skill['label']} score of {score:.0f}/100 is below the threshold for competitive performance. {skill['description']}.",
                    "exercises": skill["exercises"][:3],
                    "resources": skill["resources"][:2],
                }
                recommendations.append(rec)

        # Supplementary improvements for developing areas
        supplementary = []
        for skill_key, score in developing_areas[:2]:
            if skill_key in SKILL_AREAS:
                skill = SKILL_AREAS[skill_key]
                supplementary.append({
                    "skill": skill["label"],
                    "current_score": round(score, 1),
                    "exercise": skill["exercises"][0],
                })

        # Strengths to maintain
        strengths_to_maintain = []
        for skill_key, score in strong_areas:
            if skill_key in SKILL_AREAS:
                strengths_to_maintain.append({
                    "skill": SKILL_AREAS[skill_key]["label"],
                    "score": round(score, 1),
                    "maintenance_tip": SKILL_AREAS[skill_key]["exercises"][-1],
                })

        # Compute overall score
        overall = sum(
            scores.get(k, 60) * SKILL_AREAS[k]["weight"]
            for k in SKILL_AREAS if k in scores
        )
        grade = self._grade(overall)

        primary_weak = primary_focus[0] if primary_focus else "argument_quality"
        action_steps = [r["exercises"][0] for r in recommendations if r.get("exercises")]

        return {
            "overall_score": round(overall, 1),
            "grade": grade,
            "user_level": user_level,
            "recommendations": recommendations,
            "primary_recommendations": recommendations,
            "weakest_skill": primary_weak,
            "actionable_next_steps": action_steps,
            "supplementary_improvements": supplementary,
            "strengths_to_maintain": strengths_to_maintain,
            "skill_scores": {k: round(v, 1) for k, v in scores.items()},
            "improvement_potential": round(min(overall + 25, 100) - overall, 1),
        }

    def generate_learning_plan(
        self,
        user_level: Literal["beginner", "intermediate", "advanced"] = "intermediate",
        weak_skills: list[str] | None = None,
        sessions_per_week: int = 3,
    ) -> dict:
        """Generate a personalised 4-week learning plan."""
        plan = WEEKLY_PLANS.get(user_level, WEEKLY_PLANS["intermediate"])

        # Customise exercises for weak skills
        targeted_exercises = []
        if weak_skills:
            skill_list = list(weak_skills.keys()) if isinstance(weak_skills, dict) else list(weak_skills)
            for skill_key in skill_list[:3]:
                if skill_key in SKILL_AREAS:
                    skill = SKILL_AREAS[skill_key]
                    targeted_exercises.extend(skill["exercises"][:2])

        # Recommended drills
        if user_level == "beginner":
            drills = [d for d in DRILL_LIBRARY if d["difficulty"] == "beginner"]
        elif user_level == "advanced":
            drills = [d for d in DRILL_LIBRARY if d["difficulty"] in ("intermediate", "advanced")]
        else:
            drills = [d for d in DRILL_LIBRARY if d["difficulty"] != "advanced"]

        # Attempt Agentic AI dynamic curriculum synthesis
        if ai_agent.get_status().get("active"):
            try:
                ai_plan = ai_agent.generate_coaching_learning_plan(
                    user_level=user_level,
                    weak_skills=weak_skills,
                    sessions_per_week=sessions_per_week,
                )
                if ai_plan and ai_plan.get("weekly_plan"):
                    weekly = ai_plan["weekly_plan"]
                    targeted = ai_plan.get("targeted_skill_exercises") or targeted_exercises
                    milestones = ai_plan.get("milestones") or [
                        {"milestone": 1, "week": 1, "checkpoint": "Complete baseline assessment and identify top 2 skill gaps"},
                        {"milestone": 2, "week": 2, "checkpoint": "Demonstrate measurable improvement in identified weak areas"},
                        {"milestone": 3, "week": 3, "checkpoint": "Participate in a full practice debate with structured feedback"},
                        {"milestone": 4, "week": 4, "checkpoint": "Achieve target scores across all five weighted skill dimensions"},
                    ]
                    daily_mins = ai_plan.get("daily_commitment_minutes") or {"beginner": 25, "intermediate": 35, "advanced": 50}.get(user_level, 35)
                    return {
                        "user_level": user_level,
                        "plan_duration_weeks": 4,
                        "sessions_per_week": sessions_per_week,
                        "weekly_plan": weekly,
                        "weeks": weekly,
                        "targeted_skill_exercises": targeted[:6],
                        "recommended_drills": drills[:5],
                        "milestones": milestones,
                        "daily_commitment_minutes": daily_mins,
                        "is_ai_generated": True,
                    }
            except Exception:
                pass

        return {
            "user_level": user_level,
            "plan_duration_weeks": 4,
            "sessions_per_week": sessions_per_week,
            "weekly_plan": plan,
            "weeks": plan,
            "targeted_skill_exercises": targeted_exercises[:6],
            "recommended_drills": drills[:5],
            "milestones": [
                {"milestone": 1, "week": 1, "checkpoint": "Complete baseline assessment and identify top 2 skill gaps"},
                {"milestone": 2, "week": 2, "checkpoint": "Demonstrate measurable improvement in identified weak areas"},
                {"milestone": 3, "week": 3, "checkpoint": "Participate in a full practice debate with structured feedback"},
                {"milestone": 4, "week": 4, "checkpoint": "Achieve target scores across all five weighted skill dimensions"},
            ],
            "daily_commitment_minutes": {"beginner": 25, "intermediate": 35, "advanced": 50}.get(user_level, 35),
        }

    def get_skill_gap_analysis(self, scores: dict) -> dict:
        """Identify skill gaps and provide targeted gap-closing strategies."""
        gaps = {}
        for skill_key, skill in SKILL_AREAS.items():
            score = scores.get(skill_key, 60)
            target = 80
            gap = max(0, target - score)
            gaps[skill_key] = {
                "skill": skill_key,
                "label": skill["label"],
                "current": round(score, 1),
                "target": target,
                "gap": round(gap, 1),
                "gap_severity": "critical" if gap > 30 else "moderate" if gap > 15 else "minor",
                "top_exercise": skill["exercises"][0],
                "estimated_weeks_to_close": max(1, int(gap / 8)),
            }

        # Sort by gap size
        sorted_gaps = dict(sorted(gaps.items(), key=lambda x: -x[1]["gap"]))

        critical_gaps = [k for k, v in sorted_gaps.items() if v["gap_severity"] == "critical"]
        moderate_gaps = [k for k, v in sorted_gaps.items() if v["gap_severity"] == "moderate"]

        return {
            "skill_gaps": list(sorted_gaps.values()),
            "skill_gaps_map": sorted_gaps,
            "priority_interventions": [v["top_exercise"] for v in sorted_gaps.values()],
            "critical_areas": critical_gaps,
            "moderate_areas": moderate_gaps,
            "priority_skill": list(sorted_gaps.keys())[0] if sorted_gaps else None,
            "overall_gap": round(sum(v["gap"] * SKILL_AREAS[k]["weight"] for k, v in gaps.items()), 1),
        }

    def get_drills(self, difficulty: str | None = None, skill_type: str | None = None) -> list[dict]:
        """Return filtered drill library."""
        drills = DRILL_LIBRARY
        if difficulty:
            drills = [d for d in drills if d["difficulty"] == difficulty]
        if skill_type:
            drills = [d for d in drills if d["type"] == skill_type]
        return drills

    @staticmethod
    def _grade(score: float) -> str:
        if score >= 90: return "A+"
        if score >= 85: return "A"
        if score >= 80: return "A-"
        if score >= 75: return "B+"
        if score >= 70: return "B"
        if score >= 65: return "B-"
        if score >= 60: return "C+"
        if score >= 55: return "C"
        if score >= 50: return "C-"
        return "D"


coaching_engine = CoachingEngine()
