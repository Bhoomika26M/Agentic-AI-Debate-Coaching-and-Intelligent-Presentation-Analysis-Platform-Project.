"""Deterministic scoring. LLM provides component scores; Python computes the weighted overall."""

WEIGHTS = {
    "argument_quality": 0.30,
    "evidence_usage": 0.20,
    "logical_consistency": 0.20,
    "rebuttal_effectiveness": 0.15,
    "communication_skills": 0.15,
}

def compute_overall(scores: dict) -> float:
    total = 0.0
    for key, weight in WEIGHTS.items():
        val = scores.get(key)
        if val is None:
            raise ValueError(f"Missing required component: {key}")
        total += float(val) * weight
    return round(total, 2)

def clampi(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))