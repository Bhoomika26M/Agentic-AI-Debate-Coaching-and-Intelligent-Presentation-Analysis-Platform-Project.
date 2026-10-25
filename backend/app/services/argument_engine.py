import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ArgumentComponent(BaseModel):
    claim: str
    premises: List[str] = []
    evidence: List[str] = []
    warrant: Optional[str] = None
    strength: str = "MODERATE"  # STRONG, MODERATE, WEAK
    clarity_score: float = Field(0.0, ge=0.0, le=100.0)
    relevance_score: float = Field(0.0, ge=0.0, le=100.0)
    evidence_score: float = Field(0.0, ge=0.0, le=100.0)
    consistency_score: float = Field(0.0, ge=0.0, le=100.0)
    persuasiveness_score: float = Field(0.0, ge=0.0, le=100.0)
    overall_score: float = Field(0.0, ge=0.0, le=100.0)
    feedback: List[str] = []

class ArgumentAnalysisEngine:
    """
    Engine to extract argumentative structures using the Toulmin model
    (Claims, Premises, Evidence, Warrants) and calculate 5-dimension forensic scores.
    """

    EVIDENCE_INDICATORS = [
        r"\baccording to\b", r"\bresearch shows\b", r"\bstudy finds\b", r"\bdata demonstrates\b",
        r"\bstatistics indicate\b", r"\bfor example\b", r"\bfor instance\b", r"\bpercent\b",
        r"%", r"\bpublished in\b", r"\bevidence suggests\b", r"\bfactual analysis\b"
    ]

    PREMISE_INDICATORS = [
        r"\bbecause\b", r"\bsince\b", r"\bgiven that\b", r"\bas a result\b",
        r"\bdue to\b", r"\bthe reason being\b", r"\bthis leads to\b", r"\btherefore\b"
    ]

    CLAIM_INDICATORS = [
        r"\bwe must\b", r"\bwe should\b", r"\bit is imperative\b", r"\bthe government ought to\b",
        r"\bi contend that\b", r"\bour stance is\b", r"\bit is evident that\b", r"\bclearly\b",
        r"\bthe truth is\b", r"\bwe cannot allow\b"
    ]

    def split_sentences(self, text: str) -> List[str]:
        # Split by sentence terminators keeping reasonable lengths
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in sentences if len(s.strip()) > 5]

    def analyze_text(self, text: str, motion_context: Optional[str] = None) -> List[ArgumentComponent]:
        if not text or not text.strip():
            return []

        sentences = self.split_sentences(text)
        if not sentences:
            sentences = [text.strip()]

        arguments: List[ArgumentComponent] = []
        
        current_claim = ""
        current_premises: List[str] = []
        current_evidence: List[str] = []

        for s in sentences:
            s_lower = s.lower()
            is_evidence = any(re.search(ind, s_lower) for ind in self.EVIDENCE_INDICATORS)
            is_premise = any(re.search(ind, s_lower) for ind in self.PREMISE_INDICATORS)
            is_claim = any(re.search(ind, s_lower) for ind in self.CLAIM_INDICATORS)

            if is_evidence:
                current_evidence.append(s)
            elif is_premise:
                current_premises.append(s)
            elif is_claim or not current_claim:
                if current_claim:
                    # Flush previous argument bundle
                    arguments.append(self._score_argument(current_claim, current_premises, current_evidence, motion_context))
                    current_premises = []
                    current_evidence = []
                current_claim = s
            else:
                current_premises.append(s)

        if current_claim:
            arguments.append(self._score_argument(current_claim, current_premises, current_evidence, motion_context))
        elif sentences:
            # Fallback to treat first sentence as thesis claim
            arguments.append(self._score_argument(sentences[0], sentences[1:], current_evidence, motion_context))

        return arguments

    def _score_argument(
        self,
        claim: str,
        premises: List[str],
        evidence: List[str],
        motion_context: Optional[str] = None
    ) -> ArgumentComponent:
        # 1. Clarity score based on claim length, lack of hedging/filler jargon
        claim_len = len(claim.split())
        clarity = 85.0
        if claim_len < 4:
            clarity -= 20.0
        elif claim_len > 35:
            clarity -= 15.0

        # 2. Evidence score based on verified indicators and citation specifics
        evidence_score = 50.0
        if len(evidence) > 0:
            evidence_score += min(35.0, len(evidence) * 20.0)
            for ev in evidence:
                if any(char.isdigit() for char in ev) or "%" in ev:
                    evidence_score = min(98.0, evidence_score + 10.0)
        else:
            evidence_score = 35.0

        # 3. Relevance score (if motion context provided)
        relevance = 80.0
        if motion_context and motion_context.strip():
            context_words = set(w.lower() for w in re.findall(r'\b\w{4,}\b', motion_context))
            arg_words = set(w.lower() for w in re.findall(r'\b\w{4,}\b', claim + " " + " ".join(premises)))
            overlap = context_words.intersection(arg_words)
            if overlap:
                relevance = min(95.0, 70.0 + len(overlap) * 5.0)
            else:
                relevance = 60.0

        # 4. Consistency score
        consistency = 82.0
        # If contradictory transition markers exist without resolution
        lower_prem = " ".join(premises).lower()
        if "on the other hand" in lower_prem and "however" in lower_prem and len(premises) < 2:
            consistency -= 20.0

        # 5. Persuasiveness score
        persuasiveness = round((clarity * 0.25) + (evidence_score * 0.35) + (relevance * 0.20) + (consistency * 0.20), 1)
        overall = round((clarity + evidence_score + relevance + consistency + persuasiveness) / 5.0, 1)

        strength = "STRONG" if overall >= 75.0 else ("MODERATE" if overall >= 55.0 else "WEAK")

        feedback = []
        if evidence_score < 60.0:
            feedback.append("Ground this claim with concrete empirical evidence, case citations, or verified percentages.")
        if clarity < 75.0:
            feedback.append("State the core thesis concisely; avoid excessive qualifying clauses.")
        if len(premises) == 0:
            feedback.append("Add explicit logical warrants explaining *why* this claim holds true under scrutiny.")
        if not feedback:
            feedback.append("Strong forensic formulation with clear warrant alignment and evidence linkage.")

        warrant_summary = premises[0] if premises else "Implicit warrant: relies on axiomatic correlation."

        return ArgumentComponent(
            claim=claim,
            premises=premises,
            evidence=evidence,
            warrant=warrant_summary,
            strength=strength,
            clarity_score=clarity,
            relevance_score=relevance,
            evidence_score=evidence_score,
            consistency_score=consistency,
            persuasiveness_score=persuasiveness,
            overall_score=overall,
            feedback=feedback
        )

argument_engine = ArgumentAnalysisEngine()
