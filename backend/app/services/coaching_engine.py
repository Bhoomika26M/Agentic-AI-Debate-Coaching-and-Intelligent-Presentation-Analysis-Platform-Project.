from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ForensicDrill(BaseModel):
    title: str
    category: str
    objective: str
    difficulty: str
    estimated_min: int

class PersonalizedLearningPathway(BaseModel):
    user_id: Optional[str] = None
    target_skill_focus: str
    diagnostic_summary: str
    mastery_milestones: List[str]
    recommended_drills: List[ForensicDrill]
    strategic_advice: str

class CoachingRecommendationEngine:
    """
    Engine to analyze performance metrics and automatically generate
    customized learning paths and forensic sparring drills.
    """

    DRILL_CATALOG = {
        "EVIDENCE": [
            ForensicDrill(
                title="Empirical Inoculation Drill",
                category="Evidence & Synthesis",
                objective="Deliver a 3-minute speech incorporating 3 quantified statistics and citing methodology sources.",
                difficulty="INTERMEDIATE",
                estimated_min=15
            ),
            ForensicDrill(
                title="Warrant-Evidence Pairing Sprint",
                category="Evidence & Synthesis",
                objective="Pair 5 abstract claims with concrete historical or empirical counter-examples under 60 seconds each.",
                difficulty="ADVANCED",
                estimated_min=20
            )
        ],
        "LOGIC": [
            ForensicDrill(
                title="Syllogism Fault-Line Detection",
                category="Logical Reasoning",
                objective="Identify and deconstruct Straw Man and False Dilemma fallacies across 6 opponent motions.",
                difficulty="BEGINNER",
                estimated_min=10
            ),
            ForensicDrill(
                title="Circular Premise Elimination",
                category="Logical Reasoning",
                objective="Restructure circular claims by introducing third-party external benchmarks.",
                difficulty="INTERMEDIATE",
                estimated_min=15
            )
        ],
        "REBUTTAL": [
            ForensicDrill(
                title="The 'Even-If' Clash Protocol",
                category="Rebuttal Agility",
                objective="Construct multi-layered refutations conceding minor premises while decisively defeating core terminal impacts.",
                difficulty="ADVANCED",
                estimated_min=25
            ),
            ForensicDrill(
                title="15-Second POI Interception",
                category="Rebuttal Agility",
                objective="Answer sudden Point of Information challenges in under 15 seconds without losing speaking composure.",
                difficulty="INTERMEDIATE",
                estimated_min=15
            )
        ]
    }

    def generate_pathway(
        self,
        user_id: Optional[str] = None,
        weakest_skill: str = "LOGIC",
        current_composite: float = 65.0
    ) -> PersonalizedLearningPathway:
        weakest_key = weakest_skill.upper()
        if "EVID" in weakest_key:
            category = "Evidence Synthesis & Quantitative Grounding"
            summary = "Your speeches exhibit strong rhetorical flair but suffer from unsubstantiated empirical assertions."
            drills = self.DRILL_CATALOG["EVIDENCE"]
            milestones = [
                "Incorporate verified statistics in 80% of primary warrants",
                "Successfully rebut data-wonk opponents without conceding empirical validity",
                "Achieve >= 80% on the Evidence Usage forensic rubric"
            ]
            advice = "Ground every claim with a verified date, institution, or quantitative trend before moving to secondary warrants."
        elif "REBUT" in weakest_key or "CLASH" in weakest_key:
            category = "Rebuttal Clash & Opponent Refutation"
            summary = "You present coherent initial constructive speeches but struggle to directly clash with opposing paradigms."
            drills = self.DRILL_CATALOG["REBUTTAL"]
            milestones = [
                "Deploy the 'Even-If' refutation structure in competitive rounds",
                "Answer Points of Information within the 15-second benchmark",
                "Achieve >= 80% on the Rebuttal Effectiveness forensic rubric"
            ]
            advice = "Do not run parallel constructive cases; attack the opponent's core warrant at the root of their syllogism."
        else:
            category = "Logical Consistency & Fallacy Inoculation"
            summary = "Your argumentation occasionally employs causal leaps or binary false dilemmas under rapid cross-examination."
            drills = self.DRILL_CATALOG["LOGIC"]
            milestones = [
                "Zero detected fallacies across 3 consecutive sparring sessions",
                "Dismantle opponent Straw Man distortions with poise",
                "Achieve >= 85% on the Logical Consistency rubric"
            ]
            advice = "Slow down your reasoning chain: ensure premise A directly necessitates premise B before asserting conclusion C."

        return PersonalizedLearningPathway(
            user_id=user_id,
            target_skill_focus=category,
            diagnostic_summary=summary,
            mastery_milestones=milestones,
            recommended_drills=drills,
            strategic_advice=advice
        )

coaching_engine = CoachingRecommendationEngine()
