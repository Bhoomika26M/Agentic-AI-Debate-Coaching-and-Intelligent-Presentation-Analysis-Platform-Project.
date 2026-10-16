import os
from typing import Dict, Any, Optional
from app.agents.base import BaseSpecialistAgent
from app.schemas.scoring import ScoringResponse, ScoringWeights, ScoreBreakdown
from app.core.config import settings

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "scoring_prompt.txt")

class ScoringAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="ScoringAgent", prompt_file=PROMPT_PATH)

    def evaluate(
        self,
        argument_quality: Optional[float] = None,
        evidence_usage: Optional[float] = None,
        logical_consistency: Optional[float] = None,
        rebuttal_effectiveness: Optional[float] = None,
        communication_skills: Optional[float] = None,
        speech_text: Optional[str] = None,
    ) -> ScoringResponse:
        # Default baseline scores if not pre-computed
        arg_q = argument_quality if argument_quality is not None else 82.0
        ev_u = evidence_usage if evidence_usage is not None else 78.0
        log_c = logical_consistency if logical_consistency is not None else 84.0
        reb_e = rebuttal_effectiveness if rebuttal_effectiveness is not None else 76.0
        comm_s = communication_skills if communication_skills is not None else 80.0

        # Exact Weighted Scoring Model:
        # 30% Argument Quality + 20% Evidence Usage + 20% Logical Consistency + 15% Rebuttal Effectiveness + 15% Communication Skills
        overall = (
            settings.WEIGHT_ARGUMENT_QUALITY * arg_q +
            settings.WEIGHT_EVIDENCE_USAGE * ev_u +
            settings.WEIGHT_LOGICAL_CONSISTENCY * log_c +
            settings.WEIGHT_REBUTTAL_EFFECTIVENESS * reb_e +
            settings.WEIGHT_COMMUNICATION_SKILLS * comm_s
        )
        overall = round(overall, 1)

        critical_thinking = round(0.50 * arg_q + 0.50 * log_c, 1)
        comm_effectiveness = round(0.50 * comm_s + 0.50 * reb_e, 1)

        xp = int(overall * 2.5)  # e.g., 80.0 -> 200 XP

        audit_str = (
            f"Debate Performance Score = "
            f"({settings.WEIGHT_ARGUMENT_QUALITY:.2f} * {arg_q:.1f}) + "
            f"({settings.WEIGHT_EVIDENCE_USAGE:.2f} * {ev_u:.1f}) + "
            f"({settings.WEIGHT_LOGICAL_CONSISTENCY:.2f} * {log_c:.1f}) + "
            f"({settings.WEIGHT_REBUTTAL_EFFECTIVENESS:.2f} * {reb_e:.1f}) + "
            f"({settings.WEIGHT_COMMUNICATION_SKILLS:.2f} * {comm_s:.1f}) = {overall:.1f}"
        )

        return ScoringResponse(
            weights_applied=ScoringWeights(
                argument_quality=settings.WEIGHT_ARGUMENT_QUALITY,
                evidence_usage=settings.WEIGHT_EVIDENCE_USAGE,
                logical_consistency=settings.WEIGHT_LOGICAL_CONSISTENCY,
                rebuttal_effectiveness=settings.WEIGHT_REBUTTAL_EFFECTIVENESS,
                communication_skills=settings.WEIGHT_COMMUNICATION_SKILLS,
            ),
            scores=ScoreBreakdown(
                argument_quality=arg_q,
                evidence_usage=ev_u,
                logical_consistency=log_c,
                rebuttal_effectiveness=reb_e,
                communication_skills=comm_s,
                overall_performance_score=overall,
            ),
            critical_thinking_index=critical_thinking,
            communication_effectiveness=comm_effectiveness,
            xp_awarded=xp,
            streak_bonus=True,
            formula_audit=audit_str,
        )

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        return self.evaluate().model_dump()
