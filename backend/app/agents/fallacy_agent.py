import re
from typing import List, Dict, Any
from backend.app.ai.fallacies_kb import FALLACIES_DB
from backend.app.ai.llm_client import llm_client

class FallacyAgent:
    """Agent 3: Logical Fallacy Detection Agent - Scans text for 8+ fallacy types and provides remediation."""

    async def detect_fallacies(self, text: str) -> List[Dict[str, Any]]:
        # Check LLM first
        prompt = f"""Identify any logical fallacies in this debate statement:
"{text}"

Scan specifically for:
1. Ad Hominem
2. Straw Man
3. False Dilemma
4. Slippery Slope
5. Appeal to Authority
6. Circular Reasoning
7. Hasty Generalization
8. Red Herring

If found, return JSON:
[
  {{
    "fallacy_name": "Name",
    "confidence": 0.88,
    "problematic_statement": "exact excerpt",
    "explanation": "why this is a fallacy",
    "why_problematic": "epistemic impact",
    "correct_reasoning": "how to argue properly",
    "suggested_correction": "actionable tweak",
    "improved_argument": "corrected statement"
  }}
]
If none found, return [].
"""
        structured = await llm_client.generate_structured_json(prompt, "You are an expert formal logic and fallacy adjudicator.")
        if isinstance(structured, list):
            return structured

        # Deterministic Engine using FALLACIES_DB
        detected = []
        text_lower = text.lower()

        for f in FALLACIES_DB:
            pattern = re.compile(f["regex"], re.IGNORECASE)
            match = pattern.search(text)
            keyword_found = any(k in text_lower for k in f["keywords"])

            if match or keyword_found:
                problem_snippet = match.group(0) if match else text[:60] + "..."
                confidence = 0.90 if match else 0.75
                detected.append({
                    "fallacy_name": f["name"],
                    "confidence": confidence,
                    "problematic_statement": problem_snippet,
                    "explanation": f["explanation"],
                    "why_problematic": f["why_problematic"],
                    "correct_reasoning": f["correct_reasoning"],
                    "suggested_correction": f["suggested_correction"],
                    "improved_argument": f["sample_improved"]
                })

        return detected

fallacy_agent = FallacyAgent()
