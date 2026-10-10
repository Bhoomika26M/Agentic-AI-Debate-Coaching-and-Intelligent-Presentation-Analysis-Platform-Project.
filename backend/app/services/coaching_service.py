from datetime import UTC, datetime


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def build_learning_dashboard(user: dict, skills: dict | None) -> dict:
    base = {
        "communication_score": 0,
        "critical_thinking_score": 0,
        "debate_score": 0,
        "presentation_score": 0,
    }
    if skills:
        base.update(skills)

    values = [
        _safe_int(base.get("communication_score")),
        _safe_int(base.get("critical_thinking_score")),
        _safe_int(base.get("debate_score")),
        _safe_int(base.get("presentation_score")),
    ]
    overall = round(sum(values) / len(values), 2) if values else 0.0
    focus_areas: list[str] = []
    recommendations: list[str] = []

    for label, score_key in (
        ("Communication", "communication_score"),
        ("Critical thinking", "critical_thinking_score"),
        ("Debate structure", "debate_score"),
        ("Presentation delivery", "presentation_score"),
    ):
        current = _safe_int(base.get(score_key))
        if current < 70:
            focus_areas.append(label)
            recommendations.append(f"Practice {label.lower()} with short, evidence-backed speaking drills and quick feedback loops.")

    if not focus_areas:
        recommendations = [
            "Keep refining your strongest areas with timed rebuttals, sharper evidence, and concise summary statements.",
            "Use mock rounds to test whether your audience can clearly follow your reasoning.",
        ]

    plan = [
        {
            "week": 1,
            "goal": "Strengthen your opening statement and core claim.",
            "actions": [
                "State your claim in one sentence before supporting it.",
                "Practise a 60-second opening with three supporting points.",
            ],
        },
        {
            "week": 2,
            "goal": "Improve evidence quality and rebuttal clarity.",
            "actions": [
                "Use one specific example and one measurable fact for each major point.",
                "Prepare a short rebuttal to the strongest opposing argument.",
            ],
        },
        {
            "week": 3,
            "goal": "Turn feedback into a repeatable speaking pattern.",
            "actions": [
                "Record one full practice round and review pacing, filler words, and transitions.",
                "Refine your closing by linking evidence back to the original claim.",
            ],
        },
    ]

    return {
        "user_id": str(user["_id"]),
        "generated_at": datetime.now(UTC),
        "overall_readiness": overall,
        "scores": {
            "communication": _safe_int(base.get("communication_score")),
            "critical_thinking": _safe_int(base.get("critical_thinking_score")),
            "debate": _safe_int(base.get("debate_score")),
            "presentation": _safe_int(base.get("presentation_score")),
        },
        "focus_areas": focus_areas or ["Communication", "Critical thinking", "Debate structure", "Presentation delivery"],
        "recommendations": recommendations,
        "plan": plan,
    }
