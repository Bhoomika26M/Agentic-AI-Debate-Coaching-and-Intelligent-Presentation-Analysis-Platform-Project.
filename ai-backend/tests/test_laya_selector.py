"""Laya is optional: every failure path must fall back to the planner quietly."""

import asyncio
import time

from app.agents import laya_selector
from app.agents.laya_selector import _decision_state, move_instruction, select_move

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


def _run(monkeypatch, agent=None, loader=None) -> str | None:
    monkeypatch.setattr(laya_selector, "_AGENT", agent)
    if loader is not None:
        monkeypatch.setattr(laya_selector, "_load_agent", loader)
    return asyncio.run(
        select_move(
            "Should schools ban phones?",
            "for",
            "skeptic",
            "challenge",
            HISTORY,
            "Attention improves without phones.",
        )
    )


def test_availability_follows_the_installed_package(monkeypatch):
    monkeypatch.setattr(laya_selector, "_PACKAGE_MISSING", False)
    monkeypatch.setattr(laya_selector, "ENABLED", True)
    monkeypatch.setattr(laya_selector.importlib.util, "find_spec", lambda _name: object())
    assert laya_selector.is_available() is True

    monkeypatch.setattr(laya_selector, "ENABLED", False)
    assert laya_selector.is_available() is False


def test_a_supported_move_is_returned_with_its_instruction(monkeypatch):
    move = _run(monkeypatch, FakeAgent("probe_evidence"))
    assert move == "probe_evidence"
    assert "evidence" in move_instruction(move)


def test_an_unsupported_move_falls_back(monkeypatch):
    assert _run(monkeypatch, FakeAgent("invent_a_new_move")) is None


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


def test_disabling_laya_skips_the_checkpoint(monkeypatch):
    def explode():
        raise AssertionError("Laya is disabled")

    monkeypatch.setattr(laya_selector, "ENABLED", False)
    monkeypatch.setattr(laya_selector, "_load_agent", explode)
    assert _run(monkeypatch) is None


def test_a_missing_package_skips_the_checkpoint(monkeypatch):
    def explode():
        raise AssertionError("Laya is not installed")

    monkeypatch.setattr(laya_selector, "_PACKAGE_MISSING", True)
    monkeypatch.setattr(laya_selector, "_load_agent", explode)
    assert _run(monkeypatch) is None


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
