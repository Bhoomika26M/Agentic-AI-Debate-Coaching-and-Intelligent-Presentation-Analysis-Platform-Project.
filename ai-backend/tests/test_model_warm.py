"""The explicit warm endpoint used at app load and after a model switch."""

import asyncio

from app import main, providers


def _warm(monkeypatch, model, *, available=True, loaded=False, warmup_enabled=True):
    calls: list[str] = []
    state = {"loaded": loaded}

    async def is_available():
        return available

    async def is_loaded():
        return state["loaded"]

    async def warm_model():
        state["loaded"] = True
        calls.append(providers.local_model())

    monkeypatch.setattr(main, "is_available", is_available)
    monkeypatch.setattr(main, "is_loaded", is_loaded)
    monkeypatch.setattr(main, "warm_model", warm_model)
    monkeypatch.setattr(main, "WARMUP_ENABLED", warmup_enabled)
    monkeypatch.setattr(main, "warmup_lock", asyncio.Lock())
    result = asyncio.run(main.model_warm(model))
    return result, calls


def test_the_selected_model_is_warmed_once(monkeypatch):
    result, calls = _warm(monkeypatch, "gemma4:e4b")

    assert result["status"] == "ready"
    assert result["model"] == "gemma4:e4b"
    assert result["model_loaded"] is True
    assert calls == ["gemma4:e4b"]


def test_an_already_loaded_model_does_not_generate_again(monkeypatch):
    result, calls = _warm(monkeypatch, "qwen3.5:4b", loaded=True)

    assert result["status"] == "ready"
    assert calls == []


def test_warmup_is_a_no_op_when_disabled(monkeypatch):
    result, calls = _warm(monkeypatch, "qwen3.5:4b", warmup_enabled=False)

    assert result["status"] == "warming"
    assert calls == []


def test_an_unavailable_model_reports_why_it_cannot_warm(monkeypatch):
    result, calls = _warm(monkeypatch, "gemma4:e4b", available=False)

    assert result["status"] == "model_unavailable"
    assert result["model_available"] is False
    assert result["hint"]
    assert calls == []
