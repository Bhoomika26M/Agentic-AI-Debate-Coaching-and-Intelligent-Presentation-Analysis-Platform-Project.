import json
import re

FALLACY_PATTERNS = {
    "ad hominem": r"\b(stupid|idiot|ignorant|uneducated)\b",
    "false dilemma": r"\b(only two choices|either .* or nothing|with us or against us)\b",
    "hasty generalization": r"\b(always|never|everyone|no one)\b",
    "appeal to authority": r"\b(expert says|because .* said so)\b",
}
FILLERS = re.compile(r"\b(um+|uh+|like|you know|basically|actually)\b", re.I)


def analyze_transcript(text: str, topic: str, position: str) -> dict:
    words = re.findall(r"\b[\w'-]+\b", text)
    lower = text.lower()
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    fallacies = [{"type": name, "excerpt": text[:140]} for name, pattern in FALLACY_PATTERNS.items() if re.search(pattern, lower)]
    evidence_terms = sum(lower.count(x) for x in ("study", "data", "research", "source", "evidence", "%", "according"))
    clarity = min(100, max(35, 55 + min(20, len(sentences) * 2) - len(fallacies) * 8))
    evidence = min(100, 45 + evidence_terms * 8)
    persuasiveness = min(100, round((clarity * .45 + evidence * .35 + (15 if len(words) > 80 else 0)), 1))
    fillers = len(FILLERS.findall(text))
    pacing = round(len(words) / max(1, len(sentences)) * 12, 1)
    delivery = max(35, min(100, 90 - fillers * 3 - (8 if pacing > 180 else 0)))
    counter = [
        {"claim": f"Opposing view on {topic}", "response": f"Address the strongest {('against' if position == 'for' else 'for')} case with evidence and a specific trade-off."},
        {"claim": "What would change your mind?", "response": "Name a measurable condition or source that could update your position."},
    ]
    recommendations = [
        "Lead with a one-sentence thesis, then signpost your two strongest reasons.",
        "Support each key claim with a concrete source, example, or measurable outcome.",
    ]
    if fillers:
        recommendations.append(f"Replace {fillers} filler words with a short pause to sound more deliberate.")
    if fallacies:
        recommendations.append("Reframe the flagged language around claims and evidence rather than people or absolutes.")
    return {"clarity": clarity, "evidence": evidence, "persuasiveness": persuasiveness, "delivery": delivery,
            "overall_score": round((clarity + evidence + persuasiveness + delivery) / 4, 1),
            "fallacies": fallacies, "counterarguments": counter, "recommendations": recommendations,
            "pacing_wpm": pacing, "filler_words": fillers}


def serial_analysis(analysis) -> dict:
    result = {k: getattr(analysis, k) if k not in ("fallacies", "counterarguments", "recommendations") else json.loads(getattr(analysis, k))
              for k in ("clarity", "evidence", "persuasiveness", "delivery", "fallacies", "counterarguments", "recommendations", "pacing_wpm", "filler_words")}
    result["overall_score"] = round((result["clarity"] + result["evidence"] + result["persuasiveness"] + result["delivery"]) / 4, 1)
    return result
