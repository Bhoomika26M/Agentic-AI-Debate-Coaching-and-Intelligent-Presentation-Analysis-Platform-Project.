"""The follow-up question must lean on the learner's own answers without naming them."""

import asyncio
from types import SimpleNamespace

import pytest
from fakes import make_chat
from fastapi import HTTPException

from app import main
from app.agents import challenger
from app.schemas import ChallengeRequest
from app.usage_limits import TurnFollowUpLimiter

REPLY = (
    '{"target_sentence": "Because traffic hurts people.", '
    '"follow_up": "Which study shows that?"}'
)
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


def test_the_api_caps_follow_ups_even_when_depth_stays_zero(monkeypatch):
    monkeypatch.setattr(main, "follow_up_limiter", TurnFollowUpLimiter(limit=2))

    async def available():
        return True

    async def fake_challenge(_history, _latest, _topic, depth, _preferences=None):
        return {
            "target_sentence": LATEST,
            "follow_up": "Which study shows that?",
            "depth": depth + 1,
        }

    monkeypatch.setattr(main, "is_available", available)
    monkeypatch.setattr(challenger, "challenge_turn", fake_challenge)
    request = ChallengeRequest(topic="Should cities ban cars?", latest=LATEST, depth=0)
    http_request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    first = asyncio.run(
        main.debate_challenge(request=request, http_request=http_request, subject="learner-a")
    )
    second = asyncio.run(
        main.debate_challenge(request=request, http_request=http_request, subject="learner-a")
    )
    assert (first.depth, second.depth) == (1, 2)

    with pytest.raises(HTTPException) as raised:
        asyncio.run(
            main.debate_challenge(request=request, http_request=http_request, subject="learner-a")
        )
    assert raised.value.status_code == 429
    assert "two follow-ups" in raised.value.detail


def test_a_target_the_learner_did_not_write_is_not_quoted_back(monkeypatch):
    reply = (
        '{"target_sentence": "Because traffic hurts people everywhere.", '
        '"follow_up": "Which study shows that?"}'
    )
    monkeypatch.setattr(challenger, "chat", make_chat([reply]))
    turn = asyncio.run(
        challenger.challenge_turn(
            history=[], latest=LATEST, topic="Should cities ban cars?", depth=0
        )
    )
    assert turn is not None
    assert turn["target_sentence"] is None
    assert turn["follow_up"] == "Which study shows that?"


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
