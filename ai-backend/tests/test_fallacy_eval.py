"""Keep the labelled fallacy set, its scorer, and quote disclosure honest."""

import asyncio
import importlib.util
from collections import Counter
from pathlib import Path

from app.agents import analysis_graph
from app.schemas import FallacyBranch

EVAL = Path(__file__).resolve().parents[1] / "evals" / "evaluate_fallacies.py"


def _module():
    spec = importlib.util.spec_from_file_location("evaluate_fallacies", EVAL)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _rows():
    return _module().load_rows()


def test_the_snippet_set_is_valid_and_balanced():
    module = _module()
    rows = _rows()
    assert 40 <= len(rows) <= 60
    assert module.validate_rows(rows) == []
    counts = Counter(row["label"] for row in rows)
    assert set(counts) == module.LABELS | {module.NONE}
    assert all(counts[label] >= 5 for label in module.LABELS)
    assert counts[module.NONE] >= 8
    assert len({row["id"] for row in rows}) == len(rows)


def test_validation_rejects_an_unsupported_label_and_a_short_snippet():
    module = _module()
    rows = _rows()[:2]
    rows[0] = {**rows[0], "label": "Bad Faith"}
    rows[1] = {**rows[1], "snippet": "too short"}
    problems = module.validate_rows(rows)
    assert any("label" in problem for problem in problems)
    assert any("too short" in problem for problem in problems)


def test_precision_and_recall_are_counted_per_flag():
    module = _module()
    rows = [
        {"id": "a", "label": "Ad Hominem"},
        {"id": "b", "label": "Straw Man"},
        {"id": "c", "label": "none"},
        {"id": "d", "label": "Red Herring"},
    ]
    predictions = {
        "a": {"labels": ["Ad Hominem"], "dropped": 1},
        "b": {"labels": ["Red Herring", "Straw Man"], "dropped": 0},
        "c": {"labels": ["False Dilemma"], "dropped": 0},
        "d": {"labels": [], "dropped": 0, "error": "invalid JSON"},
    }
    results = module.score(rows, predictions)
    tally = (
        results["true_positives"],
        results["false_positives"],
        results["false_negatives"],
    )
    assert tally == (2, 2, 1)
    assert results["precision"] == 0.5
    assert results["recall"] == round(2 / 3, 3)
    assert results["quotes_dropped_as_not_verbatim"] == 1
    assert results["rows_with_model_error"] == 1
    # A snippet counts as detected when its label was among the flags, even with
    # an extra wrong label attached; the clean row is missed because it was flagged.
    assert results["hits"] == 2
    assert results["per_type"]["Straw Man"]["found"] == 1
    assert results["per_type"]["Red Herring"]["false_positives"] == 1
    assert results["per_type"]["False Dilemma"]["false_positives"] == 1


def test_a_clean_reply_with_no_flags_counts_as_a_hit():
    module = _module()
    results = module.score(
        [{"id": "a", "label": "none"}],
        {"a": {"labels": [], "dropped": 0}},
    )
    assert results["hits"] == 1
    assert results["precision"] is None
    assert results["recall"] is None


def test_dropped_quote_gap_is_singular_and_plural():
    assert analysis_graph.dropped_fallacy_gap(0) is None
    assert "1 fallacy quote" in analysis_graph.dropped_fallacy_gap(1)
    assert "2 fallacy quotes" in analysis_graph.dropped_fallacy_gap(2)


def test_the_product_discloses_a_quote_removed_by_grounding(monkeypatch):
    grounded = "Phones distract students."
    ungrounded = "they want chaos"

    async def fake_branch(*_args, **_kwargs):
        return FallacyBranch.model_validate(
            {
                "fallacies": [
                    {
                        "label": "Straw Man",
                        "quote": grounded,
                        "explanation": "This is the learner's own sentence.",
                        "revision": "Make the example concrete.",
                    },
                    {
                        "label": "Ad Hominem",
                        "quote": ungrounded,
                        "explanation": "This quote was not in the learner's turn.",
                        "revision": "Leave it out.",
                    },
                ]
            }
        ), ""

    monkeypatch.setattr(analysis_graph, "_run_branch", fake_branch)
    state = {
        "topic": "Should schools ban phones?",
        "learner_position": "for",
        "turns": [{"speaker": "learner", "content": grounded}],
    }
    branch = asyncio.run(analysis_graph.fallacy_node(state))["branch_reports"][0]
    assert branch["report"]["fallacies"][0]["quote"] == grounded
    assert "1 fallacy quote" in branch["gaps"][0]
    assert "verbatim" in branch["gaps"][0]
