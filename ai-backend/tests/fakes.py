"""Deterministic stand-ins for the model, so agent wiring can be tested without Ollama."""

import json
from collections.abc import AsyncIterator


def make_chat(replies: list[str]):
    """Return an async `chat` that answers with the given replies in order, then repeats the last."""
    calls: list[list[dict[str, str]]] = []

    async def chat(messages, **_kwargs):
        calls.append(messages)
        index = min(len(calls) - 1, len(replies) - 1)
        reply = replies[index]
        if isinstance(reply, Exception):
            raise reply
        return reply

    chat.calls = calls  # type: ignore[attr-defined]
    return chat


def make_stream(chunks: list[str]):
    """Return an async `stream` that emits the given chunks one at a time."""

    async def stream(_messages, **_kwargs) -> AsyncIterator[str]:
        for chunk in chunks:
            yield chunk

    return stream


def plan_json(**overrides) -> str:
    payload = {
        "headline": "Sharpen the evidence line",
        "summary": "Two drills that attack the weakest line in your case.",
        "drills": [
            {
                "weak_spot": "evidence_strength",
                "title": "One source per claim",
                "minutes": 10,
                "steps": ["Write the claim.", "Attach one source to it."],
                "success_check": "Every claim in your next case has a source attached.",
            }
        ],
        "milestones": [
            {
                "week": 1,
                "focus": ["evidence_strength"],
                "practice": "Two rehearsals with one source per claim.",
                "win_condition": "No unsupported claim survives the review.",
            }
        ],
        "next_session": "Rehearse once and source every claim out loud as you make it.",
    }
    payload.update(overrides)
    return json.dumps(payload)


def digest(**overrides) -> dict:
    ratings = {
        "clarity": {"score": 3, "note": "readable"},
        "relevance": {"score": 3, "note": "mostly on the question"},
        "evidence_strength": {"score": 2, "note": "asserted, not shown"},
        "logical_consistency": {"score": 3, "note": "one leap"},
        "persuasiveness": {"score": 3, "note": "flat opening"},
    }
    payload = {"ratings": ratings, "fallacy_labels": [], "filler_rate_per_100w": None}
    for key, value in overrides.items():
        if key in ratings and isinstance(value, int):
            ratings[key] = {"score": value, "note": "test"}
        else:
            payload[key] = value
    return payload
