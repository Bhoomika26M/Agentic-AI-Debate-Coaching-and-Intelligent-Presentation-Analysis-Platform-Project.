"""
Argument Analysis Engine
------------------------
A fully local, rule-based/heuristic implementation (no paid LLM calls).
It performs: claim extraction, and scoring against the five evaluation
criteria defined in the project spec: Clarity, Relevance, Evidence Strength,
Logical Consistency, Persuasiveness.

This is intentionally transparent and explainable (good for an internship
demo/report) rather than a deep semantic model. Swapping in a real LLM or a
trained classifier later only requires changing the `analyze_argument`
function's internals -- the rest of the app depends only on its output shape.
"""

import re
from typing import Dict, List

EVIDENCE_MARKERS = [
    r"\bstudy\b", r"\bstudies\b", r"\bresearch\b", r"\bdata\b", r"\bstatistic",
    r"\baccording to\b", r"\bsurvey\b", r"\breport(s|ed)?\b", r"\bevidence\b",
    r"\bexperts?\b", r"\bfor example\b", r"\bfor instance\b", r"%\b", r"\bpercent\b",
]

HEDGE_CONNECTORS = [
    r"\bbecause\b", r"\btherefore\b", r"\bsince\b", r"\bthus\b", r"\bhence\b",
    r"\bas a result\b", r"\bconsequently\b", r"\bwhich means\b", r"\bso that\b",
]

PERSUASIVE_MARKERS = [
    r"\bmust\b", r"\bshould\b", r"\bclearly\b", r"\bimportant\b", r"\bcrucial\b",
    r"\bimagine\b", r"\bconsider\b", r"\bwe need to\b", r"\bit is vital\b",
]

REBUTTAL_AWARENESS_MARKERS = [
    r"\balthough\b", r"\bhowever\b", r"\bwhile some (may|might|could) argue\b",
    r"\bcritics (say|argue|claim)\b", r"\bon the other hand\b", r"\bdespite\b",
    r"\beven though\b", r"\bone might object\b",
]

FILLER_WORDS = [r"\bum\b", r"\buh\b", r"\blike\b", r"\bactually\b", r"\bbasically\b", r"\byou know\b"]


def _split_sentences(text: str) -> List[str]:
    text = text.strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _count_matches(patterns: List[str], text: str) -> int:
    lower = text.lower()
    return sum(len(re.findall(p, lower)) for p in patterns)


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def extract_claims(text: str) -> List[str]:
    """Very lightweight claim extraction: sentences that assert something
    (contain a subject + verb-like structure and aren't purely questions)."""
    sentences = _split_sentences(text)
    claims = [s for s in sentences if not s.strip().endswith("?") and len(s.split()) >= 4]
    return claims or sentences


def score_clarity(text: str, sentences: List[str]) -> float:
    if not sentences:
        return 0.0
    avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
    filler_hits = _count_matches(FILLER_WORDS, text)
    # Ideal average sentence length ~12-20 words; penalize very long/short & filler words.
    if avg_len <= 5:
        length_score = 55
    elif avg_len <= 25:
        length_score = 95 - abs(avg_len - 15) * 1.5
    else:
        length_score = max(40, 95 - (avg_len - 25) * 3)
    penalty = filler_hits * 6
    return _clamp(length_score - penalty)


def score_relevance(text: str, topic: str) -> float:
    if not topic:
        return 70.0  # neutral baseline when no topic supplied
    topic_words = {w for w in re.findall(r"[a-zA-Z]{4,}", topic.lower())}
    text_words = re.findall(r"[a-zA-Z]{4,}", text.lower())
    if not topic_words or not text_words:
        return 60.0
    overlap = sum(1 for w in text_words if w in topic_words)
    ratio = overlap / max(1, len(topic_words))
    return _clamp(50 + ratio * 50)


def score_evidence_strength(text: str) -> float:
    hits = _count_matches(EVIDENCE_MARKERS, text)
    numbers = len(re.findall(r"\b\d+(\.\d+)?\b", text))
    score = 30 + hits * 15 + min(numbers, 3) * 8
    return _clamp(score)


def score_logical_consistency(text: str, sentences: List[str]) -> float:
    connector_hits = _count_matches(HEDGE_CONNECTORS, text)
    contradiction_pairs = [(r"\balways\b", r"\bnever\b"), (r"\ball\b", r"\bnone\b")]
    lower = text.lower()
    contradictions = sum(
        1 for a, b in contradiction_pairs if re.search(a, lower) and re.search(b, lower)
    )
    base = 55 + connector_hits * 10
    base -= contradictions * 20
    return _clamp(base)


def score_persuasiveness(text: str) -> float:
    hits = _count_matches(PERSUASIVE_MARKERS, text)
    rebuttal_awareness = _count_matches(REBUTTAL_AWARENESS_MARKERS, text)
    score = 45 + hits * 8 + rebuttal_awareness * 10
    return _clamp(score)


def score_rebuttal_effectiveness(text: str) -> float:
    """Approximates how well the argument pre-empts/handles counterpoints."""
    hits = _count_matches(REBUTTAL_AWARENESS_MARKERS, text)
    return _clamp(35 + hits * 20)


def analyze_argument(text: str, topic: str = "") -> Dict:
    sentences = _split_sentences(text)
    claims = extract_claims(text)

    clarity = score_clarity(text, sentences)
    relevance = score_relevance(text, topic)
    evidence = score_evidence_strength(text)
    consistency = score_logical_consistency(text, sentences)
    persuasiveness = score_persuasiveness(text)
    rebuttal_effectiveness = score_rebuttal_effectiveness(text)

    return {
        "claims": claims,
        "clarity": round(clarity, 1),
        "relevance": round(relevance, 1),
        "evidence_strength": round(evidence, 1),
        "logical_consistency": round(consistency, 1),
        "persuasiveness": round(persuasiveness, 1),
        "rebuttal_effectiveness": round(rebuttal_effectiveness, 1),
    }
