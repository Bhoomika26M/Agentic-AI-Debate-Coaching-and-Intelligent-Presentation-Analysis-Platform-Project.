"""Laya is optional: every failure path must fall back to the planner quietly."""

import asyncio
import time

from app.agents import laya_selector
from app.agents.laya_selector import (
    LAYA_CRITERIA,
    MOVE_INSTRUCTIONS,
    _decision_state,
    move_instruction,
    rule_based_move,
    select_move,
)

HISTORY = [
    {"speaker": "learner", "content": "Phones distract students."},
    {"speaker": "opponent", "content": "Which evidence shows that?"},
    {"speaker": "learner", "content": "Attention improves without them."},
]


class FakeAgent:
    def __init__(self, move: str | None, *, fail: bool = False) -> None:
        self.move = move
        self.fail = fail

    def predict(self, _state, _schema):
        if self.fail:
            raise RuntimeError("checkpoint failed")
        return {"answers": {"move": {"choice": self.move}}}


def _run(
    monkeypatch, agent=None, loader=None, *, history=None, latest=None, enabled=True
) -> str | None:
    monkeypatch.setattr(laya_selector, "ENABLED", enabled)
    monkeypatch.setattr(laya_selector, "_AGENT", agent)
    if loader is not None:
        monkeypatch.setattr(laya_selector, "_load_agent", loader)
    return asyncio.run(
        select_move(
            "Should schools ban phones?",
            "for",
            "skeptic",
            "challenge",
            HISTORY if history is None else history,
            "Attention improves without phones." if latest is None else latest,
        )
    )


def test_availability_follows_the_installed_package(monkeypatch):
    monkeypatch.setattr(laya_selector, "_PACKAGE_MISSING", False)
    monkeypatch.setattr(laya_selector, "ENABLED", True)
    monkeypatch.setattr(laya_selector.importlib.util, "find_spec", lambda _name: object())
    assert laya_selector.is_available() is True

    monkeypatch.setattr(laya_selector, "ENABLED", False)
    assert laya_selector.is_available() is False


def test_argument_shapes_route_without_loading_the_checkpoint(monkeypatch):
    def explode():
        raise AssertionError("A clear argument shape must not load Laya")

    assert _run(
        monkeypatch,
        loader=explode,
        latest="Phones should be banned because 82 percent of teachers say attention has fallen.",
    ) == "probe_evidence"
    assert _run(
        monkeypatch,
        loader=explode,
        latest="A ban only works if every suburb gets a reliable bus route first.",
    ) == "test_assumption"
    assert _run(
        monkeypatch,
        loader=explode,
        latest="AI graders are always fairer than tired teachers.",
    ) == "offer_counterexample"
    assert _run(
        monkeypatch,
        loader=explode,
        latest="Free buses would help low-income workers get to jobs.",
    ) == "trace_consequences"
    assert _run(
        monkeypatch,
        loader=explode,
        latest="Four-day weeks are better because productivity is a mindset.",
    ) == "clarify_claim"


def test_a_turn_after_a_challenge_answers_before_probing(monkeypatch):
    def explode():
        raise AssertionError("Turn shape alone settles this move")

    move = _run(
        monkeypatch,
        loader=explode,
        history=[
            {
                "speaker": "opponent",
                "content": "Which evidence shows that?",
                "kind": "challenge",
            }
        ],
        latest="Attention improves when phones are away.",
    )
    assert move == "answer_then_probe"
    assert rule_based_move([], "Attention improves when phones are away.") is None
    assert (
        rule_based_move(
            [{"speaker": "opponent", "content": "Which evidence shows that?"}],
            "Attention improves when phones are away.",
        )
        is None
    )


def test_laya_chooses_only_among_concrete_vulnerabilities():
    assert set(LAYA_CRITERIA) == set(MOVE_INSTRUCTIONS) - {"answer_then_probe"}


def test_a_supported_move_is_returned_with_its_instruction(monkeypatch):
    move = _run(monkeypatch, FakeAgent("probe_evidence"))
    assert move == "probe_evidence"
    assert "evidence" in move_instruction(move)


def test_an_unsupported_move_falls_back(monkeypatch):
    assert _run(monkeypatch, FakeAgent("invent_a_new_move")) is None
    assert _run(monkeypatch, FakeAgent("answer_then_probe")) is None


def test_a_failed_prediction_falls_back(monkeypatch):
    assert _run(monkeypatch, FakeAgent("probe_evidence", fail=True)) is None


def test_a_load_failure_falls_back(monkeypatch):
    def boom():
        raise RuntimeError("checkpoint missing")

    assert _run(monkeypatch, loader=boom) is None


def test_a_slow_load_falls_back_without_blocking_the_turn(monkeypatch):
    def slow():
        time.sleep(0.2)
        return FakeAgent("probe_evidence")

    monkeypatch.setattr(laya_selector, "_LOAD_TIMEOUT_SECONDS", 0.01)
    assert _run(monkeypatch, loader=slow) is None


def test_no_latest_turn_means_no_move(monkeypatch):
    def explode():
        raise AssertionError("Laya should not load without a learner turn")

    monkeypatch.setattr(laya_selector, "_load_agent", explode)
    assert (
        asyncio.run(
            select_move("Motion", "for", "skeptic", "challenge", HISTORY, "   ")
        )
        is None
    )


def test_disabling_laya_skips_the_checkpoint_but_keeps_the_argument_policy(monkeypatch):
    def explode():
        raise AssertionError("Laya is disabled")

    monkeypatch.setattr(laya_selector, "_load_agent", explode)
    assert _run(monkeypatch, enabled=False) is None
    assert _run(
        monkeypatch,
        enabled=False,
        latest="82 percent of teachers say attention has fallen.",
    ) == "probe_evidence"


def test_a_missing_package_skips_the_checkpoint(monkeypatch):
    def explode():
        raise AssertionError("Laya is not installed")

    monkeypatch.setattr(laya_selector, "_PACKAGE_MISSING", True)
    monkeypatch.setattr(laya_selector, "_load_agent", explode)
    assert _run(monkeypatch) is None
    assert _run(
        monkeypatch,
        latest="82 percent of teachers say attention has fallen.",
    ) == "probe_evidence"


def test_the_decision_state_sends_only_a_bounded_recent_exchange():
    state = _decision_state(
        "A motion " * 40,
        "for",
        "skeptic",
        "challenge",
        [
            {"speaker": "learner", "content": "one"},
            {"speaker": "opponent", "content": "two"},
            {"speaker": "learner", "content": "three"},
        ],
        "latest " * 200,
    )
    assert len(state["recent_exchange"]) == 2
    assert state["recent_exchange"][-1]["text"] == "three"
    assert len(state["latest_learner_turn"]) == 600
    assert len(state["motion"]) == 160
