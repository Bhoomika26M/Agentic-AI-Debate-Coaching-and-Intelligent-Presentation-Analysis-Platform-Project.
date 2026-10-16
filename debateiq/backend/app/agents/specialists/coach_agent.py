import os
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.schemas.coaching import CoachingFeedbackResponse, DrillRecommendation
from app.schemas.simulation import CoachWhisperResponse

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "coach_prompt.txt")

CURATED_DRILLS = [
    DrillRecommendation(
        drill_id="drill-fallacy-hunter",
        title="Speed Fallacy Hunting Drill",
        category="Fallacy Refutation",
        estimated_minutes=10,
        difficulty="Intermediate",
        instruction="Review 5 debate soundbites and identify the fallacy within 30 seconds, followed by a sound rewrite.",
        sample_exercise="Soundbite: 'Either we ban nuclear energy or we will all perish in five years.' Detect the False Dilemma and articulate the intermediate nuclear regulatory alternative.",
    ),
    DrillRecommendation(
        drill_id="drill-syllogism-bridge",
        title="Syllogism Bridge Builder",
        category="Syllogism Building",
        estimated_minutes=15,
        difficulty="Advanced",
        instruction="Construct an ironclad 3-step syllogism connecting a normative value benchmark to an empirical mechanism.",
        sample_exercise="Motion: 'This House Would Universalize Healthcare'. Major Premise: Health is a prerequisite for liberty. Minor Premise: Private systems leave 12% uncovered. Conclusion: Universalization restores liberty.",
    ),
    DrillRecommendation(
        drill_id="drill-rebuttal-pivot",
        title="The 60-Second Rebuttal Pivot",
        category="Rebuttal Speed",
        estimated_minutes=8,
        difficulty="Intermediate",
        instruction="Listen to an opponent's statistical claim and deliver a 60-second rebuttal using the 'Acknowledge, Challenge, Counter-Warrant' method.",
        sample_exercise="Opponent cites GDP growth under deregulation. Challenge: Point out wealth concentration and externalities in median purchasing power.",
    ),
]

class CoachAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="CoachAgent", prompt_file=PROMPT_PATH)

    def generate_feedback(
        self,
        overall_score: float,
        fallacy_count: int,
        weakest_pillar: str = "Evidence Usage",
    ) -> CoachingFeedbackResponse:
        strengths = [
            "Strong rhetorical clarity and persuasive sentence construction.",
            "Effectively engaged the core resolution contention.",
        ]
        if fallacy_count == 0:
            strengths.append("Exceptional dialectical discipline: zero canonical fallacies detected.")

        recommendations = [
            f"Prioritize bolstering your '{weakest_pillar}' score by incorporating peer-reviewed statistical warrants.",
            "Steel-man the opposition's position explicitly in your opening 30 seconds before refuting it.",
            "Use rhetorical signposting ('First, on causality; Second, on distributive equity') to guide adjudicators.",
        ]

        return CoachingFeedbackResponse(
            strengths_observed=strengths,
            primary_skill_gap=weakest_pillar,
            improvement_recommendations=recommendations,
            personalized_drills=CURATED_DRILLS,
            encouragement="Outstanding progress! Your reasoning structure is becoming increasingly resilient against tournament-level scrutiny.",
        )

    def whisper(
        self,
        motion_text: str,
        user_position: str,
        current_speech: str,
        opponent_speech: str = "",
    ) -> CoachWhisperResponse:
        return CoachWhisperResponse(
            hint="Challenge the opponent's unstated assumption regarding institutional implementation capacity.",
            recommended_angle="Pivot to the Practical perspective: point out that their policy lacks an operational enforcement mechanism.",
            trap_to_avoid="Avoid getting dragged into a personal character debate; keep the adjudicator focused on policy trade-offs.",
            pacing_guidance="Your speech pace is optimal (~135 WPM). Pause for 1.5 seconds after delivering your primary warrant to allow impact to register.",
        )

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        return self.generate_feedback(overall_score=80.0, fallacy_count=1).model_dump()
