import json
import os
from collections.abc import AsyncIterator

import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.5:4b")


async def is_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            model_names = {model["name"] for model in response.json().get("models", [])}
            return OLLAMA_MODEL in model_names
    except (httpx.HTTPError, ValueError, KeyError):
        return False


async def is_loaded() -> bool:
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/ps")
            response.raise_for_status()
            model_names = {model["name"] for model in response.json().get("models", [])}
            return OLLAMA_MODEL in model_names
    except (httpx.HTTPError, ValueError, KeyError):
        return False


async def stream_chat(
    messages: list[dict[str, str]], num_predict: int = 240
) -> AsyncIterator[str]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "think": False,
        "keep_alive": "10m",
        "options": {"temperature": 0.75, "num_predict": num_predict, "num_ctx": 8192},
    }
    timeout = httpx.Timeout(connect=5, read=180, write=10, pool=10)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content


async def warm_model() -> None:
    try:
        async for _ in stream_chat(
            [{"role": "user", "content": "Reply with ready."}], num_predict=1
        ):
            pass
    except (httpx.HTTPError, ValueError):
        return
