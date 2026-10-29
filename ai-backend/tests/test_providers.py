import asyncio
import json

import httpx
import pytest

from app import providers


@pytest.fixture(autouse=True)
def restore_transport():
    yield
    providers._transport = None


def _env(monkeypatch, **values):
    for key, value in values.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)


def _transport(handler):
    providers._transport = httpx.MockTransport(handler)


def test_auto_selects_ollama_without_a_hosted_key(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER=None, OPENAI_API_KEY=None)
    assert providers.provider() == "ollama"
    assert providers.model_name() == "qwen3.5:4b"


def test_auto_selects_the_hosted_provider_once_a_key_is_set(monkeypatch):
    _env(
        monkeypatch,
        LLM_PROVIDER=None,
        OPENAI_API_KEY="sk-test",
        OPENAI_MODEL="openai/gpt-4o-mini",
    )
    assert providers.provider() == "openai"
    assert providers.model_name() == "openai/gpt-4o-mini"


def test_an_explicit_provider_wins_over_the_key(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER="ollama", OPENAI_API_KEY="sk-test")
    assert providers.provider() == "ollama"


def test_hosted_chat_sends_the_schema_and_reads_the_reply(monkeypatch):
    _env(
        monkeypatch,
        LLM_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        OPENAI_BASE_URL="https://llm.example/v1",
        OPENAI_MODEL="test-model",
    )
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": '{"ok": true}'}}],
                "usage": {"total_tokens": 10},
            },
        )

    _transport(handler)
    reply = asyncio.run(
        providers.chat(
            [{"role": "user", "content": "score it"}],
            temperature=0.1,
            num_predict=900,
            json_schema={"type": "object", "properties": {"ok": {"type": "boolean"}}},
        )
    )
    assert reply == '{"ok": true}'
    assert seen["url"] == "https://llm.example/v1/chat/completions"
    assert seen["auth"] == "Bearer sk-test"
    assert seen["body"]["model"] == "test-model"
    assert seen["body"]["max_tokens"] == 900
    assert seen["body"]["stream"] is False
    assert seen["body"]["response_format"]["type"] == "json_schema"
    assert seen["body"]["response_format"]["json_schema"]["schema"]["properties"]


def test_hosted_chat_can_use_plain_json_object_mode(monkeypatch):
    _env(
        monkeypatch,
        LLM_PROVIDER="openai",
        OPENAI_API_KEY="sk-test",
        OPENAI_JSON_MODE="json_object",
    )
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}]})

    _transport(handler)
    asyncio.run(
        providers.chat(
            [{"role": "user", "content": "return json"}],
            json_schema={"type": "object"},
        )
    )
    assert seen["body"]["response_format"] == {"type": "json_object"}


def test_hosted_stream_yields_deltas_and_skips_keep_alives(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    body = "\n".join(
        [
            ": keep-alive",
            'data: {"choices":[{"delta":{"content":"Hel"}}]}',
            'data: {"choices":[{"delta":{"content":"lo"}}]}',
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
            "data: [DONE]",
            "",
        ]
    )

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=body, headers={"content-type": "text/event-stream"})

    _transport(handler)

    async def collect():
        return [chunk async for chunk in providers.stream([{"role": "user", "content": "hi"}])]

    assert asyncio.run(collect()) == ["Hel", "lo"]


def test_hosted_health_needs_a_key_and_a_reachable_endpoint(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER="openai", OPENAI_API_KEY=None)
    assert asyncio.run(providers.is_available()) is False

    _env(monkeypatch, OPENAI_API_KEY="sk-test")
    _transport(lambda request: httpx.Response(200, json={"data": []}))
    assert asyncio.run(providers.is_available()) is True
    # Hosted models are always resident, so ready is reported without warming.
    assert asyncio.run(providers.is_loaded()) is True

    _transport(lambda request: httpx.Response(401, json={"error": "bad key"}))
    assert asyncio.run(providers.is_available()) is False


def test_ollama_chat_keeps_the_local_payload(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER="ollama")
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"message": {"content": "local reply"}})

    _transport(handler)
    reply = asyncio.run(
        providers.chat(
            [{"role": "user", "content": "hi"}],
            temperature=0.2,
            num_predict=300,
            json_schema={"type": "object"},
        )
    )
    assert reply == "local reply"
    assert seen["path"] == "/api/chat"
    assert seen["body"]["stream"] is False
    assert seen["body"]["format"] == {"type": "object"}
    assert seen["body"]["options"]["temperature"] == 0.2


def test_unavailable_hints_name_the_configured_provider(monkeypatch):
    _env(monkeypatch, LLM_PROVIDER="ollama")
    assert "ollama pull" in providers.unavailable_hint()
    _env(monkeypatch, LLM_PROVIDER="openai")
    assert "OPENAI_API_KEY" in providers.unavailable_hint()
