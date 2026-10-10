from __future__ import annotations

from typing import Any

from app.services.llm_service import LLMUnavailableError, generate_json


_SYSTEM_PROMPT = """You are an expert debate opponent and coach.
Create a realistic practice round for the supplied topic and speaker position.
Return only JSON with exactly these keys: opening_statement, counterarguments,
rebuttals, strengths, weaknesses, score.
All list values must be arrays of concise strings. score must contain clarity,
evidence, rebuttal_strength, and overall, each from 0 to 100.
Do not invent named sources or factual citations."""


def simulate_with_llm(topic: str, position: str, prompt: str | None) -> dict[str, Any]:
    result = generate_json(
        _SYSTEM_PROMPT,
        (
            f"Topic: {topic}\n"
            f"Speaker position: {position}\n"
            f"Practice prompt: {prompt or 'Generate a strong opening and likely opposition.'}"
        ),
    )
    required = {
        "opening_statement",
        "counterarguments",
        "rebuttals",
        "strengths",
        "weaknesses",
        "score",
    }
    if set(result) != required or not isinstance(result["score"], dict):
        raise LLMUnavailableError("The OpenAI simulation has an unexpected schema")
    if set(result["score"]) != {"clarity", "evidence", "rebuttal_strength", "overall"}:
        raise LLMUnavailableError("The OpenAI simulation has invalid scores")
    for score in result["score"].values():
        if not isinstance(score, (int, float)) or not 0 <= score <= 100:
            raise LLMUnavailableError("The OpenAI simulation contains an invalid score")
    return result
