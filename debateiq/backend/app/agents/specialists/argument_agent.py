import os
import re
from typing import Dict, Any, List
from app.agents.base import BaseSpecialistAgent
from app.schemas.analysis import ArgumentAnalysisResponse

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "argument_prompt.txt")

class ArgumentAnalyzerAgent(BaseSpecialistAgent):
    def __init__(self):
        super().__init__(name="ArgumentAnalyzerAgent", prompt_file=PROMPT_PATH)

    def analyze(self, text: str, context: str = "Debate Speech") -> ArgumentAnalysisResponse:
        user_prompt = f"Context: {context}\nAnalyze the following speech text:\n\n{text}"
        return self.execute(user_prompt, ArgumentAnalysisResponse)

    def generate_mock_output(self, user_input: str) -> Dict[str, Any]:
        """
        Deterministic, robust linguistic analysis engine.
        Extracts claim, classifies premises (Causal, Normative, Factual, Inductive),
        extracts empirical warrants, and calculates 5 rubric scores.
        """
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', user_input) if len(s.strip()) > 8]
        if not sentences:
            sentences = [user_input.strip()]

        # Identify primary claim
        claim = sentences[0]
        for s in sentences:
            if any(w in s.lower() for w in ["we must", "should", "the government", "therefore", "i argue", "this house"]):
                claim = s
                break

        # Premise mining
        premises = []
        for s in sentences:
            if s == claim:
                continue
            lower = s.lower()
            if any(w in lower for w in ["because", "leads to", "results in", "causes", "consequently", "thereby"]):
                premises.append({"text": s, "premise_type": "Causal", "relevance_score": 88.0})
            elif any(w in lower for w in ["must", "should", "ought to", "duty", "moral", "right"]):
                premises.append({"text": s, "premise_type": "Normative", "relevance_score": 84.0})
            elif any(w in lower for w in ["percent", "%", "study", "data", "research", "shows", "demonstrates"]):
                premises.append({"text": s, "premise_type": "Factual", "relevance_score": 92.0})
            else:
                premises.append({"text": s, "premise_type": "Inductive", "relevance_score": 78.0})

        if not premises:
            premises.append({"text": "Supporting contextual premise derived from thesis argument.", "premise_type": "Factual", "relevance_score": 80.0})

        # Evidence warrants
        evidence = []
        for s in sentences:
            lower = s.lower()
            if re.search(r'\b(\d+(\.\d+)?%|\$\d+|\d+\s*(billion|million|trillion|thousand))\b', s, re.IGNORECASE):
                evidence.append({"excerpt": s, "category": "Statistical", "credibility_rating": 92.0, "verified": True})
            elif any(w in lower for w in ["study", "harvard", "mit", "university", "journal", "who", "un", "imf"]):
                evidence.append({"excerpt": s, "category": "Empirical", "credibility_rating": 90.0, "verified": True})
            elif any(w in lower for w in ["expert", "economists agree", "scientists confirm", "scholars"]):
                evidence.append({"excerpt": s, "category": "Expert Consensus", "credibility_rating": 86.0, "verified": True})
            elif any(w in lower for w in ["history", "historically", "precedent", "century"]):
                evidence.append({"excerpt": s, "category": "Historical", "credibility_rating": 80.0, "verified": True})
            elif any(w in lower for w in ["i saw", "my friend", "personally", "in my experience"]):
                evidence.append({"excerpt": s, "category": "Anecdotal", "credibility_rating": 50.0, "verified": False})

        if not evidence:
            evidence.append({"excerpt": "Contextual baseline evidence warrant.", "category": "Empirical", "credibility_rating": 75.0, "verified": True})

        # Calculate Rubric Scores
        word_count = len(user_input.split())
        has_stats = any(e["category"] == "Statistical" for e in evidence)
        has_empirical = any(e["category"] in ["Statistical", "Empirical", "Expert Consensus"] for e in evidence)

        clarity = min(96.0, max(65.0, 75.0 + (5.0 if word_count > 30 else 0.0)))
        relevance = 88.0
        evidence_strength = 92.0 if has_stats else (82.0 if has_empirical else 68.0)
        logical_consistency = 86.0 if len(premises) >= 2 else 74.0
        persuasiveness = round((clarity + relevance + evidence_strength + logical_consistency) / 4.0, 1)
        overall = round(
            0.25 * clarity + 0.25 * relevance + 0.25 * evidence_strength + 0.15 * logical_consistency + 0.10 * persuasiveness,
            1,
        )

        strengths = [
            "Clear articulation of primary thesis and dialectical position.",
            "Utilizes verifiable empirical and institutional reference points." if has_empirical else "Consistent normative framing.",
        ]
        weaknesses = [
            "Premise-to-impact link could be strengthened with deeper causal chain analysis.",
            "Could preempt opposition counter-warrants on resource allocation.",
        ]
        suggestions = [
            "Quantify the specific timeline of the proposed mechanism to enhance realism.",
            "Incorporate a pre-emptive rebuttal to address anticipated objections from the opposition.",
        ]

        return {
            "claim": claim,
            "premises": premises,
            "evidence": evidence,
            "scores": {
                "clarity": clarity,
                "relevance": relevance,
                "evidence_strength": evidence_strength,
                "logical_consistency": logical_consistency,
                "persuasiveness": persuasiveness,
                "overall": overall,
            },
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions,
        }
