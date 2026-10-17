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

# ── Skill taxonomy ─────────────────────────────────────────────────────────────

SKILL_AREAS = {
    "argument_quality": {
        "label": "Argument Quality",
        "description": "Constructing logically sound, well-structured arguments",
        "weight": 0.30,
        "exercises": [
            "Toulmin Model Exercise: For each claim, explicitly map the data → warrant → backing chain.",
            "Steelmanning Drill: Write the strongest possible version of an opposing argument before rebutting.",
            "Premise Audit: List all premises in your argument and verify each one independently.",
            "3-Point Speech: Practice limiting every speech to exactly three supporting arguments, each fully developed.",
        ],
        "resources": [
            "Read: 'The Art of Argument' by Aaron Larsen",
            "Practice: Write a 3-minute speech on a random topic daily",
            "Watch: TED Talks by expert debaters and analyse argument structure",
        ]
    },
    "evidence_usage": {
        "label": "Evidence Usage",
        "description": "Integrating and citing credible evidence effectively",
        "weight": 0.20,
        "exercises": [
            "Evidence File Building: Maintain a research database of 3 evidence cards per debate topic.",
            "Source Credibility Ranking: For each piece of evidence, rate it on a 1-5 credibility scale and explain why.",
            "Statistic Handling: Practice presenting statistics with full context, sample size, and methodology.",
            "Anecdote vs. Data Drill: Identify when an anecdote suffices and when statistical evidence is required.",
        ],
        "resources": [
            "Use Google Scholar and Semantic Scholar for peer-reviewed sources",
            "Learn APA/MLA citation formats for debate contexts",
            "Practice evaluating source credibility using SIFT framework",
        ]
    },
    "logical_consistency": {
        "label": "Logical Consistency",
        "description": "Maintaining coherent reasoning without internal contradictions",
        "weight": 0.20,
        "exercises": [
            "Fallacy Hunt: Analyse 5 political speeches per week and identify all logical fallacies.",
            "Deductive Validity Test: Convert your arguments to formal if-then structures and test for validity.",
            "Contradiction Check: Have a partner find internal contradictions in your speeches.",
            "Syllogism Practice: Build formal syllogisms for your three main arguments before each debate.",
        ],
        "resources": [
            "Study: Introduction to Logic by Irving M. Copi",
            "Online: Khan Academy — Logical Reasoning module",
            "Tool: Use argument mapping software like Rationale or Kialo",
        ]
    },
    "rebuttal_effectiveness": {
        "label": "Rebuttal Effectiveness",
        "description": "Directly engaging and dismantling opponent arguments",
        "weight": 0.15,
        "exercises": [
            "4-Step Rebuttal Framework: (1) Identify → (2) Question → (3) Counter → (4) Impact. Drill this structure.",
            "Speed Rebuttal: Listen to a 2-minute argument and prepare a rebuttal in under 30 seconds.",
            "Clash Mapping: After each practice round, map every argument raised to its rebuttal — find unaddressed clashes.",
            "Concession Practice: Identify which parts of an opponent's argument you can concede strategically without losing ground.",
        ],
        "resources": [
            "Study British Parliamentary rebuttal structures",
            "Watch World Schools Debate championship rebuttals",
        ]
    },
    "communication_skills": {
        "label": "Communication Skills",
        "description": "Delivery, clarity, persuasion, and engagement",
        "weight": 0.15,
        "exercises": [
            "Pause Training: Record yourself and count filler words (um, uh, like). Eliminate by using deliberate pauses.",
            "Vocal Variety Drill: Practice the same paragraph at 3 different speeds, volumes, and tones.",
            "Eye Contact Exercise: Practise focusing 30% of time on each zone of a three-section audience.",
            "Power Opening Workshop: Draft 5 different openers (question, statistic, story, bold claim, quotation) for the same motion.",
        ],
        "resources": [
            "Read: 'Talk Like TED' by Carmine Gallo",
            "Practice: Toastmasters International sessions",
            "Record and self-evaluate 5 minutes of speaking daily",
        ]
    },
}

# ── Learning plan templates ────────────────────────────────────────────────────

WEEKLY_PLANS = {
    "beginner": [
        {"week": 1, "focus": "Argument Structure Fundamentals", "goal": "Understand Claim-Warrant-Impact framework", "daily_practice": "20 mins"},
        {"week": 2, "focus": "Evidence Research & Citation", "goal": "Build a 10-card evidence file on a chosen topic", "daily_practice": "25 mins"},
        {"week": 3, "focus": "Fallacy Detection", "goal": "Identify all 8 fallacies in sample speeches", "daily_practice": "20 mins"},
        {"week": 4, "focus": "Basic Rebuttals", "goal": "Complete 5 rebuttal exercises using 4-step framework", "daily_practice": "30 mins"},
    ],
    "intermediate": [
        {"week": 1, "focus": "Advanced Argument Mapping", "goal": "Map full debate flows for 3 complex topics", "daily_practice": "30 mins"},
        {"week": 2, "focus": "Speed & Pressure Rebuttals", "goal": "Complete 10 timed rebuttal drills under 45 seconds", "daily_practice": "30 mins"},
        {"week": 3, "focus": "Stakeholder Analysis & Framing", "goal": "Develop 3 framing strategies per debate topic", "daily_practice": "35 mins"},
        {"week": 4, "focus": "Crystallisation & Summary Speeches", "goal": "Deliver 5 polished 2-minute summaries", "daily_practice": "40 mins"},
    ],
    "advanced": [
        {"week": 1, "focus": "Strategic Case Construction", "goal": "Build tournament-level case files for 5 topics", "daily_practice": "45 mins"},
        {"week": 2, "focus": "Cross-Examination & POIs", "goal": "Master Point of Information strategy in 10 simulations", "daily_practice": "45 mins"},
        {"week": 3, "focus": "Adjudication Mindset", "goal": "Adjudicate 5 practice debates and write detailed ballots", "daily_practice": "60 mins"},
        {"week": 4, "focus": "Tournament Preparation", "goal": "Simulate full 6-round tournament with varied motions", "daily_practice": "60 mins"},
    ],
}

DRILL_LIBRARY = [
    {"name": "1-Minute Impromptu", "type": "speaking", "difficulty": "beginner", "description": "Pick a random topic and speak for 60 seconds without preparation."},
    {"name": "Rebuttal Blitz", "type": "rebuttal", "difficulty": "intermediate", "description": "Listen to 3 arguments and rebut each in under 30 seconds."},
    {"name": "Evidence Evaluation", "type": "research", "difficulty": "beginner", "description": "Find 3 sources on a topic and rank them by credibility with justification."},
    {"name": "Fallacy Identification", "type": "logic", "difficulty": "beginner", "description": "Identify all fallacies in a provided sample speech."},
    {"name": "Toulmin Mapping", "type": "argument", "difficulty": "intermediate", "description": "Map claim → data → warrant → backing → qualifier for your main argument."},
    {"name": "Steelmanning Practice", "type": "critical_thinking", "difficulty": "advanced", "description": "Write the strongest possible version of an argument you personally disagree with."},
    {"name": "Flow Practice", "type": "note_taking", "difficulty": "intermediate", "description": "Take a structured flow of a 15-minute practice debate."},
    {"name": "Impact Calculus", "type": "argument", "difficulty": "advanced", "description": "For two competing impacts, write a 90-second comparative analysis explaining which matters more and why."},
    {"name": "Summary Speech Drill", "type": "speaking", "difficulty": "advanced", "description": "Deliver a 2-minute crystallisation speech after observing a debate round."},
    {"name": "Vocabulary Builder", "type": "communication", "difficulty": "beginner", "description": "Learn 5 debate-specific vocabulary words daily (e.g., contention, nexus, concede, warrant)."},
]


class CoachingEngine:

    def generate_recommendations(
        self,
        scores: dict,
        user_level: str = "intermediate",
        focus_areas: list[str] | None = None,
    ) -> dict:
        """
        Generate personalised coaching recommendations.
        scores: dict of {skill_area: score_0_to_100}
        """
        if not scores:
            scores = {k: 60.0 for k in SKILL_AREAS}

        # Rank skill areas by score (lowest first = needs most work)
        ranked = sorted(scores.items(), key=lambda x: x[1])

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
            for skill_key in weak_skills[:3]:
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

        return {
            "user_level": user_level,
            "plan_duration_weeks": 4,
            "sessions_per_week": sessions_per_week,
            "weekly_plan": plan,
            "weeks": plan,
            "targeted_skill_exercises": targeted_exercises[:6],
            "recommended_drills": drills[:5],
            "milestones": [
                {"week": 2, "checkpoint": "Complete baseline assessment and identify top 2 skill gaps"},
                {"week": 4, "checkpoint": "Demonstrate measurable improvement in identified weak areas"},
                {"week": 6, "checkpoint": "Participate in a full practice debate with peer feedback"},
                {"week": 8, "checkpoint": "Achieve target scores across all five weighted skill dimensions"},
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
