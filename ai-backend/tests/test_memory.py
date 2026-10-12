from fakes import digest

from app.agents.memory import (
    CRITERION_LABELS,
    briefing_for_planner,
    criterion_averages,
    diagnose,
    filler_trend,
    prioritize,
    recurring_fallacies,
    session_count,
    summarize_history,
)


def test_empty_archive_reports_nothing():
    assert summarize_history([]) is None
    assert briefing_for_planner([]) is None
    assert session_count([]) == 0
    assert criterion_averages([]) == {}


def test_criterion_averages_round_to_one_decimal():
    digests = [digest(evidence_strength=2), digest(evidence_strength=3)]
    averages = criterion_averages(digests)
    assert averages["evidence_strength"] == 2.5
    assert averages["clarity"] == 3.0


def test_recurring_fallacies_need_a_habit_not_a_slip():
    once = [digest(fallacy_labels=["Straw Man"])]
    twice = [digest(fallacy_labels=["Straw Man"]), digest(fallacy_labels=["Straw Man"])]
    assert recurring_fallacies(once) == []
    assert recurring_fallacies(twice) == [("Straw Man", 2)]


def test_filler_trend_reads_oldest_first():
    digests = [
        digest(filler_rate_per_100w=6.0),
        digest(filler_rate_per_100w=4.0),
        digest(filler_rate_per_100w=2.5),
    ]
    assert filler_trend(digests) == (6.0, 2.5)
    assert filler_trend([digest()]) == (None, None)


def test_summary_states_the_record_it_actually_holds():
    digests = [
        digest(evidence_strength=2),
        digest(evidence_strength=2, fallacy_labels=["Straw Man"]),
    ]
    summary = summarize_history(digests)
    assert summary is not None
    assert "2 past sessions" in summary
    assert "weakest evidence strength 2.0/5" in summary
    assert "Straw Man" not in summary  # one slip is not a habit
    assert "filler" not in summary


def test_summary_flags_a_recurring_fallacy():
    digests = [digest(fallacy_labels=["Hasty Generalization"]) for _ in range(2)]
    summary = summarize_history(digests)
    assert summary is not None and "Hasty Generalization x2" in summary


def test_diagnose_is_never_empty_and_uses_known_keys():
    for digests in ([], [digest()], [digest(evidence_strength=1, relevance=1)]):
        spots = diagnose(digests)
        assert spots, "a plan always has something to work on"
        for spot in spots:
            assert spot["key"] in CRITERION_LABELS
            assert spot["label"] == CRITERION_LABELS[spot["key"]]
            assert spot["evidence"] and spot["first_step"]


def test_diagnose_orders_the_weakest_criterion_first():
    digests = [digest(clarity=4, relevance=4, evidence_strength=2)]
    spots = diagnose(digests)
    assert spots[0]["key"] == "evidence_strength"


def test_diagnose_adds_delivery_when_fillers_are_high():
    digests = [digest(filler_rate_per_100w=5.5)]
    keys = [spot["key"] for spot in diagnose(digests)]
    assert "delivery" in keys


def test_prioritize_leads_with_the_weak_spot_the_learner_asked_for():
    spots = diagnose([digest()])
    assert [spot["key"] for spot in spots][:2] == ["evidence_strength", "clarity"]
    reordered = prioritize(spots, {"goal": "structure", "focus": []})
    assert [spot["key"] for spot in reordered][:2] == ["clarity", "logical_consistency"]
    assert "evidence_strength" in {spot["key"] for spot in reordered}
    assert {spot["key"] for spot in reordered} == {spot["key"] for spot in spots}


def test_prioritize_keeps_the_severity_order_without_answers():
    spots = diagnose([digest()])
    assert prioritize(spots, None) == spots
    assert prioritize(spots, {"goal": None, "focus": []}) == spots


def test_prioritize_never_adds_a_weak_spot_the_record_lacks():
    spots = diagnose([digest(clarity=2, relevance=4, evidence_strength=4, logical_consistency=4, persuasiveness=4)])
    assert [spot["key"] for spot in spots] == ["clarity", "practice_volume"]
    reordered = prioritize(spots, {"goal": "evidence", "focus": ["confidence"]})
    assert [spot["key"] for spot in reordered] == ["clarity", "practice_volume"]


def test_a_strong_archive_still_gets_a_harder_next_step():
    digests = [digest(clarity=5, relevance=5, evidence_strength=5, logical_consistency=5, persuasiveness=5) for _ in range(4)]
    spots = diagnose(digests)
    assert [spot["key"] for spot in spots] == ["practice_volume"]
    assert "cross-examination" in spots[0]["first_step"]
