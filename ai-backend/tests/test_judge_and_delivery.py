import asyncio

from app.agents.judge import WEIGHTS, judge_with_graph
from app.delivery import analyze_delivery

FALLACY_KINDS = ("Ad Hominem", "Straw Man", "False Dilemma", "Slippery Slope")


def _report(fallacies: list[dict] | None = None, **overrides) -> dict:
    report = {
        "ratings": {
            "clarity": {"score": 4, "note": "clear"},
            "relevance": {"score": 3, "note": "mostly on point"},
            "evidence_strength": {"score": 2, "note": "thin"},
            "logical_consistency": {"score": 4, "note": "sound"},
            "persuasiveness": {"score": 3, "note": "flat start"},
        },
        "fallacies": fallacies
        if fallacies is not None
        else [
            {
                "label": "Straw Man",
                "quote": "they want chaos",
                "explanation": "misstates",
                "revision": "say what they want",
            }
        ],
        "strengths": ["clear structure"],
        "next_steps": ["source the attention claim"],
        "counterarguments": [
            {"kind": kind, "response": f"{kind} challenge", "question": "how so?"}
            for kind in ("Logical", "Evidence-based", "Ethical", "Practical", "Policy")
        ],
    }
    report.update(overrides)
    return report


def _fallacy(label: str, quote: str) -> dict:
    return {"label": label, "quote": quote, "explanation": "flagged", "revision": "revise it"}


LEARNER_CASE = (
    "A city levy is the fairest way to fund the library, because every household "
    "pays a share and every household can borrow."
)
CHALLENGE = "You claim the levy is fair, but who audits the spending? Detail the oversight."
DIRECT_REBUTTAL = (
    "The levy is fair because an independent board audits the spending every year "
    "and publishes the accounts for residents."
)
DEFLECTING_REBUTTAL = "Cities simply need more parks and better buses for everyone."


def _turns(rebuttal: str) -> list[dict]:
    return [
        {"speaker": "opponent", "content": "Open: defend your funding model.", "kind": "standard"},
        {"speaker": "learner", "content": LEARNER_CASE, "kind": "standard"},
        {"speaker": "opponent", "content": CHALLENGE, "kind": "challenge"},
        {"speaker": "learner", "content": rebuttal, "kind": "standard"},
    ]


DELIVERY = {
    "report": {
        "communication_score": 5,
        "drills": [{"pattern": "rushed", "start": 12.0, "what_happened": "clipped"}],
    }
}


def _run(report: dict, delivery: dict | None = None, turns: list[dict] | None = None):
    return asyncio.run(judge_with_graph(report, delivery, turns))


def _dim(verdict: dict, key: str) -> dict:
    return next(d for d in verdict["dimensions"] if d["key"] == key)


def test_weights_sum_to_a_hundred():
    assert sum(WEIGHTS.values()) == 100


def test_verdict_is_the_weighted_mean_of_the_dimensions():
    verdict, gaps = _run(_report(), DELIVERY, _turns(DIRECT_REBUTTAL))
    assert verdict is not None
    assert [d["key"] for d in verdict["dimensions"]] == [
        "argument",
        "evidence",
        "logical",
        "rebuttal",
        "communication",
    ]
    assert sum(d["weight_pct"] for d in verdict["dimensions"]) == 100
    assert {d["weight_pct"] for d in verdict["dimensions"]} == {30, 20, 15}
    total = sum(d["score"] * d["weight_pct"] for d in verdict["dimensions"])
    assert verdict["overall"] == round(total / 100, 1)
    assert gaps == []


def test_a_missing_delivery_review_is_renormalized_not_scored_neutral():
    verdict, gaps = _run(_report(), {}, _turns(DIRECT_REBUTTAL))
    assert [d["key"] for d in verdict["dimensions"]] == [
        "argument",
        "evidence",
        "logical",
        "rebuttal",
    ]
    # 30/20/20/15 rescaled to 100 rather than a placeholder counted at 15%.
    assert sum(d["weight_pct"] for d in verdict["dimensions"]) == 100
    assert all(d["weight_pct"] != 15 for d in verdict["dimensions"])
    assert any("communication" in gap for gap in gaps)
    total = sum(d["score"] * d["weight_pct"] for d in verdict["dimensions"])
    assert verdict["overall"] == round(total / 100, 1)


def test_a_delivery_review_moves_the_communication_score():
    verdict, _gaps = _run(_report(), DELIVERY, _turns(DIRECT_REBUTTAL))
    communication = _dim(verdict, "communication")
    assert communication["score"] == 5.0
    assert communication["citations"]


def test_fallacy_quotes_are_cited_in_the_logic_dimension():
    verdict, _gaps = _run(_report())
    logical = _dim(verdict, "logical")
    assert any("Straw Man" in citation for citation in logical["citations"])


def test_the_number_of_fallacies_does_not_set_the_rebuttal_score():
    """The old bug: rebuttal was 5 - len(fallacies), whatever the learner said."""
    fallacies = [_fallacy(label, f"quote {index}") for index, label in enumerate(FALLACY_KINDS)]
    clean, _ = _run(_report(fallacies=[]), {}, _turns(DIRECT_REBUTTAL))
    noisy, _ = _run(_report(fallacies=fallacies), {}, _turns(DIRECT_REBUTTAL))
    assert _dim(clean, "rebuttal")["score"] == _dim(noisy, "rebuttal")["score"] == 5.0


def test_the_rebuttal_score_follows_the_learner_replies():
    answered, _ = _run(_report(), {}, _turns(DIRECT_REBUTTAL))
    deflected, _ = _run(_report(), {}, _turns(DEFLECTING_REBUTTAL))
    assert _dim(answered, "rebuttal")["score"] == 5.0
    assert _dim(deflected, "rebuttal")["score"] < 3.0
    assert "follow-up" in _dim(deflected, "rebuttal")["note"]


def test_a_fallacy_inside_the_rebuttal_lowers_that_score():
    quote = "anyone who objects wants children to go untaught"
    reply = f"{DIRECT_REBUTTAL} {quote}."
    without, _ = _run(_report(fallacies=[]), {}, _turns(reply))
    with_flag, _ = _run(_report(fallacies=[_fallacy("Straw Man", quote)]), {}, _turns(reply))
    assert _dim(with_flag, "rebuttal")["score"] < _dim(without, "rebuttal")["score"]


def test_a_fallacy_elsewhere_in_the_transcript_is_not_charged_to_the_rebuttal():
    quote = "every household"
    with_flag, _ = _run(
        _report(fallacies=[_fallacy("Hasty Generalization", quote)]),
        {},
        _turns(DIRECT_REBUTTAL),
    )
    assert _dim(with_flag, "rebuttal")["score"] == 5.0


def test_rebuttal_is_disclosed_when_there_are_no_replies_to_score():
    verdict, gaps = _run(_report(), {}, [])
    assert "rebuttal" not in {d["key"] for d in verdict["dimensions"]}
    assert any("rebuttal" in gap for gap in gaps)


def test_an_opening_case_is_not_scored_as_a_rebuttal():
    """The first learner turn answers the opponent's opening, but it is a case."""
    verdict, gaps = _run(
        _report(),
        {},
        [
            {"speaker": "opponent", "content": CHALLENGE, "kind": "standard"},
            {"speaker": "learner", "content": DIRECT_REBUTTAL},
        ],
    )
    assert "rebuttal" not in {d["key"] for d in verdict["dimensions"]}
    assert any("rebuttal" in gap for gap in gaps)


def test_a_later_reply_is_scored_against_the_point_it_answers():
    turns = [
        {"speaker": "opponent", "content": "Open: defend your funding model.", "kind": "standard"},
        {"speaker": "learner", "content": LEARNER_CASE},
        {"speaker": "opponent", "content": CHALLENGE, "kind": "standard"},
        {"speaker": "learner", "content": DIRECT_REBUTTAL},
    ]
    verdict, _gaps = _run(_report(), {}, turns)
    rebuttal = _dim(verdict, "rebuttal")
    assert rebuttal["score"] == 5.0
    assert "1 of 1" in rebuttal["note"]


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
    assert {event["kind"] for event in signals["events"]} == {"rushed", "paused"}


def test_delivery_labels_name_pace_and_pauses_not_emotion():
    segments = [
        {"text": "The plan is simple and fair.", "start": 0.0, "end": 3.0},
        {"text": "It gives every family a clear choice.", "start": 4.5, "end": 8.5},
        {"text": "That is why I support it today.", "start": 10.0, "end": 14.0},
    ]
    events = analyze_delivery(segments)["events"]
    labels = {event["label"] for event in events}
    assert {"Long pause", "Steady pace"} <= labels
    assert not any(
        word in label.lower()
        for label in labels
        for word in ("tense", "flat", "nervous", "anxious", "calm")
    )


def test_ordinary_words_are_not_counted_as_fillers():
    segments = [
        {
            "text": "I like this policy because it actually works, basically.",
            "start": 0.0,
            "end": 4.0,
        }
    ]
    signals = analyze_delivery(segments)
    assert signals["filler_count"] == 0
    assert signals["filler_rate_per_100w"] == 0.0


def test_a_multi_word_filler_is_counted_once_per_occurrence():
    segments = [
        {"text": "So you know the plan, you know, is simple.", "start": 0.0, "end": 4.0}
    ]
    assert analyze_delivery(segments)["filler_count"] == 2


def test_delivery_signals_stay_sane_with_no_segments():
    signals = analyze_delivery([])
    assert signals["words"] == 0
    assert signals["wpm"] >= 0
