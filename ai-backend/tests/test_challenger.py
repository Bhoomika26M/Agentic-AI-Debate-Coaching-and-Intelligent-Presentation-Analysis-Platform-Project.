"""The follow-up question must lean on the learner's own answers without naming them."""

import asyncio

from fakes import make_chat

from app.agents import challenger

REPLY = '{"target_sentence": "Because traffic hurts people.", "follow_up": "Which study shows that?"}'
LATEST = "Because traffic hurts people."


def _run(monkeypatch, preferences=None):
    chat = make_chat([REPLY])
    monkeypatch.setattr(challenger, "chat", chat)
    turn = asyncio.run(
        challenger.challenge_turn(
            history=[{"speaker": "learner", "content": LATEST}],
            latest=LATEST,
            topic="Should cities ban cars from their centres?",
            depth=0,
            preferences=preferences,
        )
    )
    return turn, chat.calls[0][0]["content"]


def test_the_follow_up_prompt_carries_the_learners_aim(monkeypatch):
    turn, system = _run(
        monkeypatch, {"goal": "evidence", "purpose": "competition", "focus": ["argument"]}
    )
    assert turn is not None
    assert "grounding every claim" in system
    assert "tournament standards of proof" in system
    assert "test the claims themselves" in system


def test_the_aim_is_hidden_from_the_learner(monkeypatch):
    _, system = _run(monkeypatch, {"goal": "nerves"})
    assert "never quote or mention it" in system


def test_an_answer_free_session_asks_the_same_question(monkeypatch):
    _, plain = _run(monkeypatch)
    assert "asked to work on" not in plain
    _, none = _run(monkeypatch, None)
    assert plain == none


def test_an_unusable_answer_mapping_is_ignored(monkeypatch):
    _, system = _run(monkeypatch, {"goal": "not-a-goal", "focus": ["vibes"]})
    assert "asked to work on" not in system


def test_pressure_stops_once_the_exchange_is_deep_enough(monkeypatch):
    def explode(*_args, **_kwargs):
        raise AssertionError("no question should be asked at max depth")

    monkeypatch.setattr(challenger, "chat", explode)
    turn = asyncio.run(
        challenger.challenge_turn(
            history=[], latest=LATEST, topic="Motion", depth=challenger.MAX_DEPTH
        )
    )
    assert turn is None
