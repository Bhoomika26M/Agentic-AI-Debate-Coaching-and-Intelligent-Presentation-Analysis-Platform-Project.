"""
Central Gemini integration. ALL generative AI features route through here.
Uses the official google-genai SDK with one configured model.
"""
import json
import logging
from typing import Any
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: genai.Client | None = None

def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client

class GeminiError(Exception):
    """Raised when Gemini API fails. Never silently return fabricated content."""

def _generate(prompt: str, system_instruction: str | None = None, json_mode: bool = False) -> str:
    """Low-level generation call. Raises GeminiError on failure."""
    try:
        config_kwargs: dict[str, Any] = {"temperature": 0.7}
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"

        response = get_client().models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        if not response or not response.text:
            raise GeminiError("Empty response from Gemini")
        return response.text
    except GeminiError:
        raise
    except Exception as e:
        logger.error("Gemini call failed: %s", e)
        raise GeminiError(f"AI service error: {str(e)}")

def _parse_json(text: str) -> dict:
    """Robust JSON extraction from model output."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse JSON: %s | raw=%s", e, text[:300])
        raise GeminiError("AI returned malformed JSON. Please retry.")

# ---------- FEATURE FUNCTIONS (all use same model) ----------

def analyze_argument(argument: str, topic: str | None) -> dict:
    system = "You are an expert debate coach. Return ONLY valid JSON."
    prompt = f"""Analyze this argument{' on topic: ' + topic if topic else ''}.
Argument: \"\"\"{argument}\"\"\"

Return JSON with these exact keys:
{{
  "main_claim": str,
  "supporting_reasons": [str],
  "evidence_used": [str],
  "missing_evidence": [str],
  "clarity_score": float 0-100,
  "relevance_score": float 0-100,
  "logical_consistency_score": float 0-100,
  "persuasiveness_score": float 0-100,
  "strengths": [str],
  "weaknesses": [str],
  "improvement_suggestions": [str]
}}"""
    return _parse_json(_generate(prompt, system, json_mode=True))

def detect_fallacies(argument: str) -> dict:
    system = "You are a logic expert. Return ONLY valid JSON. Do not force fallacies."
    prompt = f"""Examine this argument for logical fallacies from this set only:
Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority,
Circular Reasoning, Hasty Generalization, Red Herring.

Argument: \"\"\"{argument}\"\"\"

If none present, return empty list. Return JSON:
{{
  "fallacies": [
    {{"name": str, "excerpt": str, "explanation": str,
      "why_problematic": str, "correction": str, "confidence": str}}
  ]
}}"""
    return _parse_json(_generate(prompt, system, json_mode=True))

def generate_counterarguments(claim: str, topic: str | None = None) -> dict:
    system = "You are a debate strategist. Return ONLY valid JSON. Do not invent citations."
    prompt = f"""Generate counterarguments for: \"\"\"{claim}\"\"\"
Topic context: {topic or 'general'}

Return JSON:
{{
  "counterarguments": [
    {{"type": "logical|evidence|ethical|practical|policy",
      "text": str, "reasoning": str, "evidence_needed": str}}
  ],
  "challenge_questions": [str],
  "strategy_suggestions": [str]
}}"""
    return _parse_json(_generate(prompt, system, json_mode=True))

def ai_opponent_response(topic: str, ai_position: str, user_position: str,
                         history: list[dict], user_message: str) -> str:
    """Multi-turn AI opponent. Returns plain text, not JSON."""
    system = (
        f"You are an AI debate opponent arguing {ai_position} on: {topic}. "
        f"The user argues {user_position}. "
        "Directly address their arguments, be respectful, avoid repetition, stay on position."
    )
    history_text = "\n".join(
        f"{m['sender'].upper()}: {m['content']}" for m in history[-6:]
    )
    prompt = f"""Debate history:
{history_text}

User's latest: {user_message}

Respond with a strong 2-4 sentence counterargument."""
    return _generate(prompt, system).strip()

def analyze_presentation(transcript: str, duration_seconds: float | None) -> dict:
    system = "You are a presentation coach. Return ONLY valid JSON. Estimates are subjective."
    prompt = f"""Analyze this presentation transcript.
Duration: {duration_seconds or 'unknown'} seconds
Transcript: \"\"\"{transcript}\"\"\"

Return JSON:
{{
  "clarity_score": float 0-100,
  "organization_score": float 0-100,
  "engagement_score": float 0-100,
  "strengths": [str],
  "weaknesses": [str],
  "improvement_suggestions": [str],
  "opening_suggestion": str,
  "conclusion_suggestion": str
}}"""
    return _parse_json(_generate(prompt, system, json_mode=True))

def generate_coaching(profile: dict, recent_evals: list[dict]) -> dict:
    system = "You are a personalized debate coach. Return ONLY valid JSON."
    prompt = f"""User profile: {json.dumps(profile)}
Recent performance: {json.dumps(recent_evals)}

Return JSON:
{{
  "debate_exercises": [str],
  "presentation_exercises": [str],
  "reasoning_practice": [str],
  "weekly_goals": [str],
  "suggested_next": [str]
}}"""
    return _parse_json(_generate(prompt, system, json_mode=True))

def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe audio via Gemini multimodal input. Raises GeminiError if unsupported."""
    try:
        response = get_client().models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                "Transcribe this audio accurately. Return only the transcript.",
            ],
        )
        if not response or not response.text:
            raise GeminiError("Empty transcription response")
        return response.text.strip()
    except GeminiError:
        raise
    except Exception as e:
        raise GeminiError(f"Audio transcription unavailable: {str(e)}")