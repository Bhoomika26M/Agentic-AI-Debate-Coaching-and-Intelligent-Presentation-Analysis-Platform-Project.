from typing import Dict, Any, List
from backend.app.ai.llm_client import llm_client

class ChallengeAgent:
    """Agent 5: Real-Time Challenge Generator - Crafts dynamic Socratic questions, dilemmas, and pressure tests."""

    async def generate_challenges(self, user_argument: str, topic: str, difficulty: str) -> Dict[str, Any]:
        prompt = f"""Generate dynamic real-time debate challenges for this statement:
Topic: "{topic}"
Difficulty: {difficulty}
Argument: "{user_argument}"

Return JSON:
{{
  "socratic_question": "Deep inquiry probing underlying axioms",
  "what_if_scenario": "Compelling edge-case scenario testing boundaries",
  "evidence_challenge": "Demand for empirical verification of a key premise",
  "counterclaim": "Direct opposing assertion",
  "difficulty_level": "{difficulty}"
}}
"""
        structured = await llm_client.generate_structured_json(prompt, "You are a Socratic debate interrogator.")
        if structured and "socratic_question" in structured:
            return structured

        # Deterministic challenge generation
        return {
            "socratic_question": f"If your premise holds true, does that obligate society to accept all downstream interventions with equal confidence, or where does that justification terminate?",
            "what_if_scenario": f"What if an unforeseen macroeconomic downturn reduces available public subsidies by 40%—does your proposed framework remain viable, or does it collapse without external capital?",
            "evidence_challenge": f"You assert that this approach generates superior long-term outcomes. Can you cite a controlled trial or longitudinal study demonstrating this without survivorship bias?",
            "counterclaim": f"Decentralized, voluntary market solutions have consistently outperformed centralized mandates on this exact challenge over the past decade.",
            "difficulty_level": difficulty
        }

challenge_agent = ChallengeAgent()
