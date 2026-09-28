from typing import Dict, Any, List
from backend.app.ai.llm_client import llm_client

class TopicAgent:
    """Agent 1: Topic Agent - Analyzes debate topic, stances, key contentions, and stakeholders."""

    async def analyze_topic(self, topic: str, position: str, format_type: str) -> Dict[str, Any]:
        prompt = f"""Analyze the debate topic: "{topic}"
Position: {position}
Format: {format_type}

Provide JSON:
{{
  "key_contentions_for": ["point 1", "point 2"],
  "key_contentions_against": ["point 1", "point 2"],
  "key_stakeholders": ["stakeholder 1", "stakeholder 2"],
  "core_definitions": {{"term": "definition"}},
  "framework_focus": "ethical / empirical / policy"
}}
"""
        structured = await llm_client.generate_structured_json(prompt, "You are a master debate topic analyst.")
        if structured:
            return structured

        # Deterministic fallback
        words = topic.lower()
        framework = "policy" if any(w in words for w in ["should", "ban", "legalize", "mandate", "policy"]) else ("ethical" if any(w in words for w in ["moral", "right", "ethical", "duty", "justice"]) else "empirical")

        return {
            "key_contentions_for": [
                f"Adopting {topic[:30]} fosters systemic modernization and efficiency.",
                "Empirical evidence demonstrates tangible socio-economic advantages.",
                "Mitigates critical vulnerabilities inherent in legacy frameworks."
            ],
            "key_contentions_against": [
                f"Implementing {topic[:30]} introduces severe risks of inequity and disruption.",
                "High transition costs and unforeseen externalities compromise stability.",
                "Alternative targeted interventions achieve similar goals with fewer trade-offs."
            ],
            "key_stakeholders": ["Consumers & Citizens", "Regulatory Bodies", "Industry Leaders", "Vulnerable Communities"],
            "core_definitions": {
                "Motion": topic,
                "Position": position,
                "Burden of Proof": "Requires demonstrating net positive utility and operational feasibility."
            },
            "framework_focus": framework
        }

topic_agent = TopicAgent()
