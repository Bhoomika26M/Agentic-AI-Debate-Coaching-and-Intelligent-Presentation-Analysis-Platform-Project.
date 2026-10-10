from __future__ import annotations

from typing import Any

from app.services.llm_service import LLMUnavailableError, generate_json


_SYSTEM_PROMPT = """You are an expert debate coach.
Analyze the supplied debate transcript. Return only a JSON object with exactly
these keys: arguments, fallacies, counterarguments, scores, feedback.
arguments is an array of objects with text, claim, evidence (array of strings),
reasoning (string or null), and quality (number 0-100).
fallacies is an array of objects with type, text, explanation, and severity.
counterarguments and feedback are arrays of concise strings.
scores must contain claim_quality, evidence_quality, reasoning_quality,
fallacy_control, and overall, all numbers from 0 to 100.
Do not invent citations or facts not present in the transcript."""


def analyze_with_llm(transcript: str) -> dict[str, Any]:
    result = generate_json(
        _SYSTEM_PROMPT,
        f"Transcript to analyze:\n\n{transcript}",
    )
    _validate_result(result)
    return result


def _validate_result(result: dict[str, Any]) -> None:
    required = {"arguments", "fallacies", "counterarguments", "scores", "feedback"}
    if set(result) != required:
        raise LLMUnavailableError("The OpenAI analysis has an unexpected schema")
    scores = result["scores"]
    if not isinstance(scores, dict) or set(scores) != {
        "claim_quality",
        "evidence_quality",
        "reasoning_quality",
        "fallacy_control",
        "overall",
    }:
        raise LLMUnavailableError("The OpenAI analysis has invalid scores")
    for score in scores.values():
        if not isinstance(score, (int, float)) or not 0 <= score <= 100:
            raise LLMUnavailableError("The OpenAI analysis contains an invalid score")
