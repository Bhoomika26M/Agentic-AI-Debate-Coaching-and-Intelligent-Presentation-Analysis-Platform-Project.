import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from ..ollama_client import OLLAMA_BASE_URL, OLLAMA_MODEL, stream_chat


def _check_key(provider_key: str | None) -> None:
    if provider_key:
        raise RuntimeError("Hosted provider chat is not enabled yet.")


async def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    num_predict: int = 1400,
    json_schema: dict[str, Any] | None = None,
    provider_key: str | None = None,
) -> str:
    _check_key(provider_key)
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
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
    return response.json().get("message", {}).get("content", "")


async def stream(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.75,
    num_predict: int = 240,
    provider_key: str | None = None,
) -> AsyncIterator[str]:
    _check_key(provider_key)
    if temperature == 0.75 and num_predict == 240:
        async for delta in stream_chat(messages, num_predict=num_predict):
            yield delta
        return
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "think": False,
        "keep_alive": "10m",
        "options": {"temperature": temperature, "num_predict": num_predict, "num_ctx": 8192},
    }
    timeout = httpx.Timeout(connect=5, read=180, write=10, pool=10)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                content = json.loads(line).get("message", {}).get("content", "")
                if content:
                    yield content
