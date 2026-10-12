import asyncio

from app.agents.judge import WEIGHTS, judge_with_graph
from app.delivery import analyze_delivery


def _report(**overrides) -> dict:
    report = {
        "ratings": {
            "clarity": {"score": 4, "note": "clear"},
            "relevance": {"score": 3, "note": "mostly on point"},
            "evidence_strength": {"score": 2, "note": "thin"},
            "logical_consistency": {"score": 4, "note": "sound"},
            "persuasiveness": {"score": 3, "note": "flat start"},
        },
        "fallacies": [{"label": "Straw Man", "quote": "they want chaos", "explanation": "misstates", "revision": "say what they want"}],
        "strengths": ["clear structure"],
        "next_steps": ["source the attention claim"],
        "counterarguments": [
            {"kind": kind, "response": f"{kind} challenge", "question": "how so?"}
            for kind in ("Logical", "Evidence-based", "Ethical", "Practical", "Policy")
        ],
    }
    report.update(overrides)
    return report


def test_weights_sum_to_a_hundred():
    assert sum(WEIGHTS.values()) == 100


def test_verdict_is_the_weighted_mean_of_the_dimensions():
    verdict, gaps = asyncio.run(judge_with_graph(_report()))
    assert verdict is not None
    total = sum(dimension["score"] * dimension["weight_pct"] for dimension in verdict["dimensions"])
    assert verdict["overall"] == round(total / 100, 1)
    assert [d["key"] for d in verdict["dimensions"]] == [
        "argument",
        "evidence",
        "logical",
        "rebuttal",
        "communication",
    ]
    assert gaps, "unscored delivery has to be disclosed, not silently neutral"


def test_a_missing_delivery_review_is_disclosed_not_hidden():
    verdict, gaps = asyncio.run(judge_with_graph(_report(), {}))
    communication = next(d for d in verdict["dimensions"] if d["key"] == "communication")
    assert communication["score"] == 3.0
    assert any("communication" in gap for gap in gaps)


def test_a_delivery_review_moves_the_communication_score():
    delivery = {
        "report": {
            "communication_score": 5,
            "drills": [{"pattern": "rushed", "start": 12.0, "what_happened": "clipped"}],
        }
    }
    verdict, _gaps = asyncio.run(judge_with_graph(_report(), delivery))
    communication = next(d for d in verdict["dimensions"] if d["key"] == "communication")
    assert communication["score"] == 5.0
    assert communication["citations"]


def test_fallacy_quotes_are_cited_in_the_logic_dimension():
    verdict, _gaps = asyncio.run(judge_with_graph(_report()))
    logical = next(d for d in verdict["dimensions"] if d["key"] == "logical")
    assert any("Straw Man" in citation for citation in logical["citations"])


def test_delivery_signals_count_words_pauses_and_fillers():
    segments = [
        {"text": "So um the plan is simple.", "start": 0.0, "end": 2.0},
        {"text": "It is um fast and cheap.", "start": 4.5, "end": 6.5},
    ]
    signals = analyze_delivery(segments)
    assert signals["words"] == 12
    assert signals["filler_count"] == 2
    assert signals["filler_rate_per_100w"] == round(signals["filler_count"] / 12 * 100, 1)
    assert signals["pause_count"] == 1
    assert signals["longest_pause_sec"] == 2.5
    assert {event["kind"] for event in signals["events"]} == {"rushed", "tense"}


def test_delivery_signals_stay_sane_with_no_segments():
    signals = analyze_delivery([])
    assert signals["words"] == 0
    assert signals["wpm"] >= 0
