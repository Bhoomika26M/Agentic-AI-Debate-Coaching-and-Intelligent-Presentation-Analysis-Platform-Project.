"""Explainable, local analysis primitives used by the API."""
import json
import re
from pathlib import Path
from collections import Counter

FALLACY_PATTERNS = {
    "ad hominem": (r"\b(stupid|idiot|ignorant|uneducated)\b", "Address the claim, not the person."),
    "false dilemma": (r"\b(only two choices|either .* or nothing|with us or against us)\b", "Name additional options and trade-offs."),
    "hasty generalization": (r"\b(always|never|everyone|no one)\b", "Qualify the claim and add representative evidence."),
    "appeal to authority": (r"\b(expert says|because .* said so)\b", "Explain the evidence rather than relying on status."),
    "slippery slope": (r"\b(if we .* then .* (disaster|chaos|nothing will stop))\b", "Show the causal steps and their likelihood."),
    "straw man": (r"\b(they (want|believe) .* (nothing|everything|all)\b)", "Restate the strongest version of the opposing view."),
    "circular reasoning": (r"\b(because it is true|true because|proves itself)\b", "Supply an independent premise or source."),
    "red herring": (r"\b(irrelevant|besides the point|what about)\b", "Return to the question and connect evidence to the claim."),
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
         "severity": "high" if name in ("ad hominem", "false dilemma") else "medium",
         "explanation": FALLACY_PATTERNS[name][1], "correction": FALLACY_PATTERNS[name][1]}
        for name, (pattern, _) in FALLACY_PATTERNS.items() if re.search(pattern, lower)
    ]
    evidence_terms = sum(lower.count(x) for x in EVIDENCE)
    reasoning_terms = sum(lower.count(x) for x in REASONING)
    fillers = len(FILLERS.findall(text))
    pacing = round(len(words) / max(1, len(sentences)) * 12, 1)
    clarity = min(100, max(35, 48 + min(25, len(sentences) * 3) + (10 if arguments["structure"]["has_thesis"] else 0) - len(fallacies) * 8))
    evidence_score = min(100, 40 + evidence_terms * 7 + len(arguments["evidence"]) * 4)
    relevance = min(100, 45 + (12 if topic.lower().split()[0] in lower else 0) + len(arguments["claims"]) * 4)
    reasoning_score = min(100, 35 + reasoning_terms * 7 + len(arguments["reasons"]) * 6)
    logical_consistency = max(20, min(100, reasoning_score - len(fallacies) * 6 + (10 if arguments["structure"]["has_thesis"] else 0)))
    argument_quality = round(clarity * .35 + evidence_score * .3 + logical_consistency * .35, 1)
    rebuttal_effectiveness = round(clarity * .35 + reasoning_score * .35 + evidence_score * .3, 1)
    persuasiveness = min(100, round(clarity * .4 + evidence_score * .3 + reasoning_score * .3, 1))
    delivery = max(35, min(100, 92 - fillers * 3 - (8 if pacing > 180 else 0) - (5 if pacing < 90 and words else 0)))
    communication_skills = round(clarity * .45 + delivery * .35 + persuasiveness * .2, 1)
    default_weights = {"argument_quality": .30, "evidence_usage": .20, "logical_consistency": .20,
                       "rebuttal_effectiveness": .15, "communication_skills": .15}
    weights = {**default_weights, **(weights or {})}
    score_dimensions = {"argument_quality": argument_quality, "evidence_usage": evidence_score,
                       "logical_consistency": logical_consistency, "rebuttal_effectiveness": rebuttal_effectiveness,
                       "communication_skills": communication_skills}
    total = sum(weights.get(k, 0) * v for k, v in score_dimensions.items())
    counter = [
        {"type": "steelman", "claim": f"Opposing view on {topic}", "response": f"Address the strongest {('against' if position == 'for' else 'for')} case with evidence and a specific trade-off.", "strategy": "steelman"},
        {"type": "falsifiability", "claim": "What would change your mind?", "response": "Name a measurable condition or source that could update your position.", "strategy": "falsifiability"},
        {"type": "reframe", "claim": "Can this claim be scoped more precisely?", "response": "Define the audience, time horizon, and constraints before defending it.", "strategy": "scope"},
        {"type": "evidence_request", "claim": "What is your strongest supporting evidence?", "response": "Cite a source and explain why it applies to this context.", "strategy": "evidence"},
    ]
    recommendations = ["Lead with a one-sentence thesis, then signpost your two strongest reasons.",
                       "Support each key claim with a concrete source, example, or measurable outcome."]
    if fillers: recommendations.append(f"Replace {fillers} filler words with a short pause to sound more deliberate.")
    if fallacies: recommendations.append("Reframe flagged language around claims and evidence rather than people or absolutes.")
    confidence = max(20, min(100, delivery + (8 if reasoning_terms else 0) - len(fallacies) * 4))
    engagement = max(20, min(100, clarity * .5 + persuasiveness * .5))
    credibility = max(20, min(100, evidence_score * .65 + logical_consistency * .35 - len(fallacies) * 5))
    critical_thinking = round(argument_quality * .4 + logical_consistency * .35 + relevance * .25, 1)
    return {"clarity": clarity, "evidence": evidence_score, "persuasiveness": persuasiveness, "delivery": delivery,
             "overall_score": round(total, 1), "weights": weights, "arguments": arguments, "reasoning_score": reasoning_score,
             "argument_quality": argument_quality, "evidence_usage": evidence_score,
             "relevance": relevance, "credibility": round(credibility, 1), "critical_thinking": critical_thinking,
             "logical_consistency": logical_consistency, "rebuttal_effectiveness": rebuttal_effectiveness,
             "communication_skills": communication_skills, "confidence_score": round(confidence, 1),
             "engagement_score": round(engagement, 1), "score_dimensions": score_dimensions,
            "fallacies": fallacies, "counterarguments": counter, "recommendations": recommendations,
            "pacing_wpm": pacing, "filler_words": fillers, "word_frequency": Counter(w.lower() for w in words).most_common(8)}


def serial_analysis(analysis) -> dict:
    result = {k: getattr(analysis, k) if k not in ("fallacies", "counterarguments", "recommendations") else json.loads(getattr(analysis, k))
              for k in ("clarity", "evidence", "persuasiveness", "delivery", "fallacies", "counterarguments", "recommendations", "pacing_wpm", "filler_words")}
    result["overall_score"] = round((result["clarity"] + result["evidence"] + result["persuasiveness"] + result["delivery"]) / 4, 1)
    return result


def transcribe_media(path: str, supplied: str = "") -> tuple[str, str]:
    """Best-effort transcription with a deterministic, explicit fallback.

    Whisper is intentionally optional because it brings a large torch dependency.
    No cloud key is ever passed to a local process.
    """
    if supplied.strip():
        return supplied.strip()[:30000], "supplied_transcript"
    try:
        import whisper  # type: ignore
        from .config import settings
        model_name = getattr(settings, "whisper_model", "") or "base"
        model = whisper.load_model(model_name)
        result = model.transcribe(str(Path(path)), fp16=False)
        text = str(result.get("text", "")).strip()[:30000]
        if text:
            return text, "local_whisper"
    except Exception:
        pass
    return "", "deterministic_no_transcript"
