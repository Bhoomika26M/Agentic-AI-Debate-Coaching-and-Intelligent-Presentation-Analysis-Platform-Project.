"""
Performance Scoring Engine + lightweight Recommendation Engine.

Implements the exact weighted formula from the project spec:
Debate Performance Score =
    Argument Quality (30%) + Evidence Usage (20%) + Logical Consistency (20%)
    + Rebuttal Effectiveness (15%) + Communication Skills (15%)
"""

from typing import Dict, List

WEIGHTS = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_skills": 0.15,
}


def compute_scores(analysis: Dict, fallacy_count: int) -> Dict:
    argument_quality = (analysis["clarity"] + analysis["relevance"] + analysis["persuasiveness"]) / 3
    evidence_usage = analysis["evidence_strength"]
    # Each detected fallacy chips away at logical consistency.
    logical_consistency = max(0.0, analysis["logical_consistency"] - fallacy_count * 8)
    rebuttal_effectiveness = analysis["rebuttal_effectiveness"]
    communication_skills = (analysis["clarity"] + analysis["persuasiveness"]) / 2

    overall = (
        argument_quality * WEIGHTS["argument_quality"]
        + evidence_usage * WEIGHTS["evidence_usage"]
        + logical_consistency * WEIGHTS["logical_consistency"]
        + rebuttal_effectiveness * WEIGHTS["rebuttal_effectiveness"]
        + communication_skills * WEIGHTS["communication_skills"]
    )

    return {
        "argument_quality_score": round(argument_quality, 1),
        "evidence_usage_score": round(evidence_usage, 1),
        "logical_consistency_score": round(logical_consistency, 1),
        "rebuttal_effectiveness_score": round(rebuttal_effectiveness, 1),
        "communication_skills_score": round(communication_skills, 1),
        "overall_score": round(overall, 1),
    }


def generate_recommendations(analysis: Dict, fallacies: List[Dict], scores: Dict) -> List[str]:
    recs = []

    if scores["evidence_usage_score"] < 55:
        recs.append("Back up your claims with specific data, studies, or named sources to strengthen credibility.")
    if scores["logical_consistency_score"] < 55:
        recs.append("Tighten the logical chain between your claims and reasons -- use connectors like 'because' or 'therefore' explicitly.")
    if analysis["clarity"] < 60:
        recs.append("Simplify long or run-on sentences and cut filler words to improve clarity.")
    if scores["rebuttal_effectiveness_score"] < 55:
        recs.append("Anticipate the strongest counterargument and address it directly (e.g. 'Some may argue X, however...').")
    if fallacies:
        fallacy_types = sorted({f["type"] for f in fallacies})
        recs.append(f"Review and revise instances of: {', '.join(fallacy_types)}.")
    if analysis["persuasiveness"] < 55:
        recs.append("Strengthen persuasive framing with clearer calls to action and confident language.")

    if not recs:
        recs.append("Strong, well-supported argument -- consider adding a counterpoint rebuttal to make it even more persuasive.")

    return recs
