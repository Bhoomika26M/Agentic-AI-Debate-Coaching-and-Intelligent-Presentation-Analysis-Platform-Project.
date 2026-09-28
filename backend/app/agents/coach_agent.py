from typing import Dict, Any, List
from backend.app.ai.llm_client import llm_client

class CoachAgent:
    """Agent 6: Debate Coaching Assistant - Delivers actionable, personalized coaching feedback."""

    async def generate_coaching(
        self,
        user_argument: str,
        topic: str,
        fallacies: List[Dict[str, Any]],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        prompt = f"""Provide coaching feedback for this debater on "{topic}":
Argument: "{user_argument}"
Detected fallacies: {fallacies}
Scores: {analysis}

Return JSON:
{{
  "what_you_did_well": "specific strengths in delivery or reasoning",
  "what_needs_improvement": "concrete target area for growth",
  "strongest_argument_element": "the most defensible aspect of their argument",
  "weakest_argument_element": "the most vulnerable vulnerability",
  "missing_evidence_tip": "specific data/citation they should incorporate",
  "suggested_better_response": "an exemplary revised response",
  "next_practice_exercise": "targeted drill recommendation"
}}
"""
        structured = await llm_client.generate_structured_json(prompt, "You are a master collegiate debate coach.")
        if structured and "what_you_did_well" in structured:
            return structured

        # Deterministic feedback engine
        has_fallacies = len(fallacies) > 0
        fallacy_text = f"Notice the {fallacies[0]['fallacy_name']} pattern: avoid relying on unhedged claims." if has_fallacies else "Strong structural discipline with zero overt fallacies."

        evidence_score = analysis.get("evidence_score", 65.0)
        evidence_tip = "Bolster your claims with numerical figures or reputable academic citations to increase audience conviction." if evidence_score < 75 else "Good empirical awareness; strengthen attribution by citing methodology."

        return {
            "what_you_did_well": "Your thesis is clearly articulated, maintaining steady thematic coherence throughout the exchange.",
            "what_needs_improvement": "Deepen evidentiary support and anticipate trade-offs before the opposing bench leverages them against you.",
            "strongest_argument_element": "The primary contention identifying core utility and societal impact.",
            "weakest_argument_element": "The transition between the initial premise and the final projected outcome leaves room for counter-causality.",
            "missing_evidence_tip": evidence_tip,
            "suggested_better_response": analysis.get("improved_version", "Ground your claim in verified case studies with quantitative impact metrics."),
            "next_practice_exercise": "Practice identifying and countering logical fallacies" if has_fallacies else "Practice supporting claims with relevant statistical evidence"
        }

coach_agent = CoachAgent()
