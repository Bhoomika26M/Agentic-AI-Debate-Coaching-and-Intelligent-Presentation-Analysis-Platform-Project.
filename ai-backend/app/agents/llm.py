"""The single gateway every agent uses to reach a language model.

The transport is chosen in `app.providers`: a local Ollama daemon in
development, or any OpenAI-compatible endpoint when the app is deployed.
"""

from collections.abc import AsyncIterator
from typing import Any

from ..providers import chat as provider_chat
from ..providers import stream as provider_stream


async def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    num_predict: int = 1400,
    json_schema: dict[str, Any] | None = None,
) -> str:
    return await provider_chat(
        messages,
        temperature=temperature,
        num_predict=num_predict,
        json_schema=json_schema,
    )


async def stream(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.75,
    num_predict: int = 240,
) -> AsyncIterator[str]:
    async for delta in provider_stream(
        messages, temperature=temperature, num_predict=num_predict
    ):
        yield delta
