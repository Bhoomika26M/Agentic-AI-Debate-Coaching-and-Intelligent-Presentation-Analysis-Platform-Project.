import os
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.schemas.analysis import RebuttalMatrixResponse

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "rebuttal_prompt.txt")

class RebuttalAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="RebuttalAgent", prompt_file=PROMPT_PATH)

    def generate_rebuttals(
        self,
        target_claim: str,
        motion_context: str = "Debate Resolution",
        target_position: str = "opposition",
    ) -> RebuttalMatrixResponse:
        user_prompt = (
            f"Motion: {motion_context}\n"
            f"Target Position: {target_position}\n"
            f"Target Claim to Rebut:\n{target_claim}\n"
            f"Generate 5 distinct strategic counterarguments (Logical, Evidence-Based, Ethical, Practical, Policy)."
        )
        return self.execute(user_prompt, RebuttalMatrixResponse)

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        """
        Deterministic mock generator synthesizing 5 strategic counterarguments.
        """
        claim_snippet = user_input.split("\n")[-1][:80]

        rebuttals = [
            {
                "perspective": "Logical",
                "counter_thesis": f"The argument assumes an unproven correlation between the proposal and the claimed benefit.",
                "premises": [
                    "Confounding economic variables have not been isolated in the proponent's causal model.",
                    "The conclusion depends on an unstated assumption of uniform institutional compliance.",
                ],
                "suggested_evidence": "Academic literature on regression discontinuity and omitted variable bias.",
                "challenge_question": "Can the speaker point to a single jurisdiction where this causal relationship held without substantial confounding subsidies?",
            },
            {
                "perspective": "Evidence-Based",
                "counter_thesis": f"Empirical longitudinal studies contradict the assertion that this approach yields net positive gains.",
                "premises": [
                    "Recent meta-analyses demonstrate diminishing returns after the initial trial period.",
                    "Baseline control groups exhibited comparable organic growth without mandatory intervention.",
                ],
                "suggested_evidence": "OECD 2024 Comparative Economic Review and Brookings Institute Empirical Bulletin.",
                "challenge_question": "How do you reconcile this claim with the 2023 longitudinal data showing a 14% efficiency drop post-implementation?",
            },
            {
                "perspective": "Ethical",
                "counter_thesis": f"The proposed mandate imposes disproportionate burdens on vulnerable stakeholders.",
                "premises": [
                    "Infringing upon autonomous decision-making produces severe deontological harm.",
                    "The distributional consequences unfairly favor well-resourced incumbents over marginalized groups.",
                ],
                "suggested_evidence": "Bioethics and Distributive Justice Frameworks (Rawlsian Difference Principle).",
                "challenge_question": "Why should underprivileged communities bear the acute transitional costs while the benefits accrue to elite institutions?",
            },
            {
                "perspective": "Practical",
                "counter_thesis": f"The administrative overhead and implementation frictions render the policy operationally non-viable.",
                "premises": [
                    "Bureaucratic enforcement mechanisms will exhaust over 40% of the allocated capital.",
                    "Shortages of specialized technical labor will cause severe implementation bottlenecks.",
                ],
                "suggested_evidence": "Government Accountability Office (GAO) audit of federal transition programs.",
                "challenge_question": "Given existing agency backlogs, what is the realistic enforcement mechanism to prevent widespread non-compliance?",
            },
            {
                "perspective": "Policy",
                "counter_thesis": f"A targeted incentive-based regulatory sandbox achieves superior outcomes without coercive disruption.",
                "premises": [
                    "Decentralized market mechanisms allocate resources with 3x greater capital efficiency.",
                    "Incremental pilot programs minimize systemic downside risk while preserving innovation upside.",
                ],
                "suggested_evidence": "Comparative case study of Nordic vs. Central European regulatory innovation pilots.",
                "challenge_question": "Why adopt a rigid, irreversible mandate when a phased pilot structure delivers the same upside with zero systemic exposure?",
            },
        ]

        return {
            "target_claim": claim_snippet,
            "rebuttals": rebuttals,
            "recommended_strategy": "Pivot to the Evidence-Based & Policy counterarguments: establish empirical doubt on efficacy first, then present the phased incentive alternative as the superior common-sense path.",
            "weakness_exploited": "Over-reliance on normative assertions without addressing administrative friction and confounding variables.",
        }
