"""One chat transport for a local Ollama daemon or any OpenAI-compatible API.

Every model call in the app goes through this module, so the same code runs
against `ollama` in development and against a hosted OpenAI-compatible endpoint
when the app is deployed. Selection is explicit through `LLM_PROVIDER`, or
automatic: a configured `OPENAI_API_KEY` means hosted, otherwise Ollama.
"""

import json
import logging
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx

from .ollama_client import OLLAMA_BASE_URL
from .ollama_client import stream_chat as ollama_stream

logger = logging.getLogger(__name__)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

# Tests replace this with an httpx.MockTransport; production leaves it unset.
_transport: httpx.AsyncBaseTransport | None = None


def provider() -> str:
    configured = os.getenv("LLM_PROVIDER", "auto").strip().lower()
    if configured in ("openai", "ollama"):
        return configured
    return "openai" if _api_key() else "ollama"


def _api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _hosted_base_url() -> str:
    configured = os.getenv("OPENAI_BASE_URL", DEFAULT_OPENAI_BASE_URL).strip()
    return (configured or DEFAULT_OPENAI_BASE_URL).rstrip("/")


def _hosted_json_mode() -> str:
    """`json_schema` on OpenAI; `json_object` for providers without schemas."""
    return os.getenv("OPENAI_JSON_MODE", "json_schema").strip().lower() or "json_schema"


def model_name() -> str:
    if provider() == "openai":
        return os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    return OLLAMA_MODEL


def provider_label() -> str:
    return "OpenAI-compatible endpoint" if provider() == "openai" else "Ollama"


def unavailable_hint() -> str:
    if provider() == "openai":
        return (
            "The hosted model is unavailable. Check OPENAI_API_KEY, OPENAI_BASE_URL, "
            "and OPENAI_MODEL on the API."
        )
    return (
        f"Ollama or model {OLLAMA_MODEL} is unavailable. Start Ollama and pull the model "
        f"(`ollama pull {OLLAMA_MODEL}`)."
    )


def _client(timeout: httpx.Timeout) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=timeout, transport=_transport)


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    key = _api_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    return headers


def _hosted_payload(
    messages: list[dict[str, str]],
    temperature: float,
    num_predict: int,
    json_schema: dict[str, Any] | None,
    stream: bool,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model_name(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": num_predict,
        "stream": stream,
    }
    if json_schema is not None:
        if _hosted_json_mode() == "json_object":
            payload["response_format"] = {"type": "json_object"}
        else:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": "report", "schema": json_schema, "strict": False},
            }
    if stream:
        payload["stream_options"] = {"include_usage": False}
    return payload


async def _ollama_chat(
    messages: list[dict[str, str]],
    temperature: float,
    num_predict: int,
    json_schema: dict[str, Any] | None,
) -> str:
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "think": False,
        "keep_alive": "10m",
        "options": {"temperature": temperature, "num_predict": num_predict, "num_ctx": 8192},
    }
    if json_schema is not None:
        payload["format"] = json_schema
    timeout = httpx.Timeout(connect=5, read=300, write=10, pool=10)
    async with _client(timeout) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
    return response.json().get("message", {}).get("content", "")


async def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    num_predict: int = 1400,
    json_schema: dict[str, Any] | None = None,
) -> str:
    if provider() == "ollama":
        return await _ollama_chat(messages, temperature, num_predict, json_schema)
    payload = _hosted_payload(messages, temperature, num_predict, json_schema, stream=False)
    timeout = httpx.Timeout(connect=10, read=300, write=10, pool=10)
    async with _client(timeout) as client:
        response = await client.post(
            f"{_hosted_base_url()}/chat/completions", json=payload, headers=_headers()
        )
        response.raise_for_status()
    choices = response.json().get("choices") or []
    content = (choices[0].get("message", {}).get("content") if choices else "") or ""
    return content


async def stream(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.75,
    num_predict: int = 240,
) -> AsyncIterator[str]:
    if provider() == "ollama":
        async for delta in ollama_stream(messages, num_predict=num_predict):
            yield delta
        return
    payload = _hosted_payload(messages, temperature, num_predict, None, stream=True)
    timeout = httpx.Timeout(connect=10, read=180, write=10, pool=10)
    async with _client(timeout) as client:
        async with client.stream(
            "POST",
            f"{_hosted_base_url()}/chat/completions",
            json=payload,
            headers=_headers(),
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    choices = json.loads(data).get("choices") or []
                except json.JSONDecodeError:
                    continue
                content = choices[0].get("delta", {}).get("content") if choices else ""
                if content:
                    yield content


async def is_available() -> bool:
    if provider() == "openai":
        if not _api_key():
            return False
        try:
            async with _client(httpx.Timeout(5)) as client:
                response = await client.get(f"{_hosted_base_url()}/models", headers=_headers())
                return response.status_code == 200
        except (httpx.HTTPError, ValueError):
            return False
    try:
        async with _client(httpx.Timeout(1.5)) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            model_names = {model["name"] for model in response.json().get("models", [])}
            return OLLAMA_MODEL in model_names
    except (httpx.HTTPError, ValueError, KeyError):
        return False


async def is_loaded() -> bool:
    """Hosted models need no warm-up; Ollama reports whether the model is resident."""
    if provider() == "openai":
        return await is_available()
    try:
        async with _client(httpx.Timeout(1.5)) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/ps")
            response.raise_for_status()
            model_names = {model["name"] for model in response.json().get("models", [])}
            return OLLAMA_MODEL in model_names
    except (httpx.HTTPError, ValueError, KeyError):
        return False


async def warm() -> None:
    """Load a local model ahead of the first turn; a no-op for hosted endpoints."""
    if provider() == "openai":
        return
    try:
        async for _ in stream(
            [{"role": "user", "content": "Reply with ready."}], num_predict=1
        ):
            pass
    except (httpx.HTTPError, ValueError):
        return
