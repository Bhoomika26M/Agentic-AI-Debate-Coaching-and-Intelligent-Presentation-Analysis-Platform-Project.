from __future__ import annotations

import json
from typing import Any

from openai import OpenAI
from openai import OpenAIError

from app.core.config import settings


class LLMUnavailableError(RuntimeError):
    """Raised when the configured LLM cannot provide a response."""


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise LLMUnavailableError("OPENAI_API_KEY is not configured")
    kwargs: dict[str, Any] = {
        "api_key": settings.openai_api_key,
        "timeout": settings.openai_timeout_seconds,
    }
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def generate_json(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Generate a validated JSON object with the configured OpenAI model."""
    try:
        response = _client().chat.completions.create(
            model=settings.openai_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
    except OpenAIError as exc:
        raise LLMUnavailableError("The OpenAI request failed") from exc

    content = response.choices[0].message.content
    if not content:
        raise LLMUnavailableError("The OpenAI response was empty")
    try:
        result = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMUnavailableError("The OpenAI response was not valid JSON") from exc
    if not isinstance(result, dict):
        raise LLMUnavailableError("The OpenAI response was not a JSON object")
    return result


def llm_enabled() -> bool:
    return settings.llm_provider.lower() == "openai" and bool(settings.openai_api_key)
