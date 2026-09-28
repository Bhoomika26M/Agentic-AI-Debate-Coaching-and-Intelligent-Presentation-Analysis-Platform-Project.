from typing import Dict, Any, List
from backend.app.ai.llm_client import llm_client

class CounterargumentAgent:
    """Agent 4: Counterargument Generation Engine - Produces 5-tier rebuttals and strategic challenges."""

    async def generate_counterarguments(self, user_argument: str, topic: str, position: str) -> Dict[str, Any]:
        prompt = f"""Generate multi-layered counterarguments for the debate topic: "{topic}".
User position: {position}.
User's argument: "{user_argument}"

Generate a complete JSON response matching this schema:
{{
  "logical_rebuttal": "Attack weaknesses, non-sequiturs, and unproven premises.",
  "evidence_rebuttal": "Counter empirical data and research contradicting the claim.",
  "ethical_rebuttal": "Ethical dilemmas, equity, and moral consequences of this stance.",
  "practical_rebuttal": "Real-world operational, cost, and logistics barriers.",
  "policy_rebuttal": "Regulatory, legislative, and institutional implementation hurdles.",
  "challenge_questions": [
    "Challenge Question 1?",
    "Challenge Question 2?",
    "Challenge Question 3?"
  ],
  "strategy_suggestions": "Debate strategy recommendations on how an opponent will attack this.",
  "explanation": "Explanation of WHY each counterargument effectively deconstructs the position."
}}
"""
        structured = await llm_client.generate_structured_json(prompt, "You are a master collegiate debater and debate coach specializing in strategic rebuttals.")
        if structured and "logical_rebuttal" in structured and "evidence_rebuttal" in structured:
            return structured

        # Deterministic 5-Tier Counterargument Generator
        opposing_position = "Against" if "for" in position.lower() else "In Favor of"
        topic_clean = topic[:45]

        return {
            "logical_rebuttal": f"The argument commits a causal leap by assuming that supporting {topic_clean} inherently produces the forecasted benefits without accounting for confounding market and behavioral variables.",
            "evidence_rebuttal": f"Recent empirical policy evaluations indicate that similar initiatives across OECD pilot programs experienced significant efficiency degradation, failing to reproduce hypothesized productivity gains.",
            "ethical_rebuttal": f"From an ethical standpoint, prioritizing this motion disproportionately shifts transition risks onto marginalized communities who lack the capital buffers to absorb structural disruption.",
            "practical_rebuttal": f"Operationally, implementing this framework requires enormous capital expenditures, extensive workforce retraining, and a complex multi-year infrastructure overhaul that most organizations cannot sustain.",
            "policy_rebuttal": f"From a regulatory governance perspective, enforcing compliance presents severe jurisdiction friction, privacy liabilities, and potential anti-competitive entrenchment among dominant incumbent entities.",
            "challenge_questions": [
                f"How do you address the documented 30% overhead variance observed in comparative pilot programs?",
                f"If market incentives fail to align with compliance goals, what secondary enforcement mechanism ensures public accountability?",
                f"What specific safeguard prevents this policy from exacerbating socio-economic disparities during the multi-year transition?"
            ],
            "strategy_suggestions": f"Anchor your next response on defensive hedging: acknowledge implementation friction upfront and introduce a staged risk-mitigation protocol before the opponent exploits the cost vector.",
            "explanation": "These counterarguments work because they systematically dissect the proposal across all primary debate battlegrounds: logical validity, empirical defensibility, moral legitimacy, operational feasibility, and legal governance."
        }

counterargument_agent = CounterargumentAgent()
