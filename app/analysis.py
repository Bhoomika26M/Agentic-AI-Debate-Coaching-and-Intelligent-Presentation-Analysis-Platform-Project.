"""Explainable, local analysis primitives used by the API."""
import json
import re
from collections import Counter

FALLACY_PATTERNS = {
    "ad hominem": r"\b(stupid|idiot|ignorant|uneducated)\b",
    "false dilemma": r"\b(only two choices|either .* or nothing|with us or against us)\b",
    "hasty generalization": r"\b(always|never|everyone|no one)\b",
    "appeal to authority": r"\b(expert says|because .* said so)\b",
    "slippery slope": r"\b(if we .* then .* (disaster|chaos|nothing will stop))\b",
}
FILLERS = re.compile(r"\b(um+|uh+|like|you know|basically|actually)\b", re.I)
EVIDENCE = ("study", "data", "research", "source", "evidence", "according", "%", "survey", "example")
REASONING = ("because", "therefore", "so that", "leads to", "consequently", "if ", "then ")


def _sentences(text):
    return [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]


def extract_arguments(text: str) -> dict:
    """Extract claims, reasons and evidence without requiring an external model."""
    sentences = _sentences(text)
    claims = [s for s in sentences if len(re.findall(r"\b\w+\b", s)) >= 5][:8]
    reasons = [s for s in sentences if any(term in s.lower() for term in REASONING)][:8]
    evidence = [s for s in sentences if any(term in s.lower() for term in EVIDENCE)][:8]
    return {
        "claims": claims,
        "reasons": reasons,
        "evidence": evidence,
        "sentence_count": len(sentences),
        "word_count": len(re.findall(r"\b[\w'-]+\b", text)),
        "structure": {"has_thesis": bool(sentences), "has_reasons": bool(reasons), "has_evidence": bool(evidence)},
    }


def analyze_transcript(text: str, topic: str, position: str, weights: dict | None = None) -> dict:
    words = re.findall(r"\b[\w'-]+\b", text)
    lower = text.lower()
    sentences = _sentences(text)
    arguments = extract_arguments(text)
    fallacies = [
        {"type": name, "excerpt": next((s for s in sentences if re.search(pattern, s, re.I)), text[:140]),
         "severity": "high" if name in ("ad hominem", "false dilemma") else "medium"}
        for name, pattern in FALLACY_PATTERNS.items() if re.search(pattern, lower)
    ]
    evidence_terms = sum(lower.count(x) for x in EVIDENCE)
    reasoning_terms = sum(lower.count(x) for x in REASONING)
    fillers = len(FILLERS.findall(text))
    pacing = round(len(words) / max(1, len(sentences)) * 12, 1)
    clarity = min(100, max(35, 48 + min(25, len(sentences) * 3) + (10 if arguments["structure"]["has_thesis"] else 0) - len(fallacies) * 8))
    evidence_score = min(100, 40 + evidence_terms * 7 + len(arguments["evidence"]) * 4)
    reasoning_score = min(100, 35 + reasoning_terms * 7 + len(arguments["reasons"]) * 6)
    persuasiveness = min(100, round(clarity * .4 + evidence_score * .3 + reasoning_score * .3, 1))
    delivery = max(35, min(100, 92 - fillers * 3 - (8 if pacing > 180 else 0) - (5 if pacing < 90 and words else 0)))
    default_weights = {"clarity": .25, "evidence": .25, "persuasiveness": .25, "delivery": .25}
    weights = {**default_weights, **(weights or {})}
    total = sum(weights.get(k, 0) * v for k, v in {"clarity": clarity, "evidence": evidence_score, "persuasiveness": persuasiveness, "delivery": delivery}.items())
    counter = [
        {"claim": f"Opposing view on {topic}", "response": f"Address the strongest {('against' if position == 'for' else 'for')} case with evidence and a specific trade-off.", "strategy": "steelman"},
        {"claim": "What would change your mind?", "response": "Name a measurable condition or source that could update your position.", "strategy": "falsifiability"},
    ]
    recommendations = ["Lead with a one-sentence thesis, then signpost your two strongest reasons.",
                       "Support each key claim with a concrete source, example, or measurable outcome."]
    if fillers: recommendations.append(f"Replace {fillers} filler words with a short pause to sound more deliberate.")
    if fallacies: recommendations.append("Reframe flagged language around claims and evidence rather than people or absolutes.")
    return {"clarity": clarity, "evidence": evidence_score, "persuasiveness": persuasiveness, "delivery": delivery,
            "overall_score": round(total, 1), "weights": weights, "arguments": arguments, "reasoning_score": reasoning_score,
            "fallacies": fallacies, "counterarguments": counter, "recommendations": recommendations,
            "pacing_wpm": pacing, "filler_words": fillers, "word_frequency": Counter(w.lower() for w in words).most_common(8)}


def serial_analysis(analysis) -> dict:
    result = {k: getattr(analysis, k) if k not in ("fallacies", "counterarguments", "recommendations") else json.loads(getattr(analysis, k))
              for k in ("clarity", "evidence", "persuasiveness", "delivery", "fallacies", "counterarguments", "recommendations", "pacing_wpm", "filler_words")}
    result["overall_score"] = round((result["clarity"] + result["evidence"] + result["persuasiveness"] + result["delivery"]) / 4, 1)
    return result
