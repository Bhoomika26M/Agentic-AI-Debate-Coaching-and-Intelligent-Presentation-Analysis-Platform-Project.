"""
NVIDIA NIM fallback text service.
Called ONLY when Gemini is busy (503/429) or unavailable.
Uses OpenAI-compatible endpoint: https://integrate.api.nvidia.com/v1
"""
import logging
from openai import OpenAI, APIError, RateLimitError, APITimeoutError
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: OpenAI | None = None

class NvidiaFallbackError(Exception):
    """Raised when NVIDIA fallback also fails."""

def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not settings.NVIDIA_API_KEY:
            raise NvidiaFallbackError("NVIDIA_API_KEY not configured")
        _client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY,
            max_retries=1,
        )
    return _client

def generate_text(prompt: str, system_instruction: str | None = None, json_mode: bool = False) -> str:
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    try:
        resp = get_client().chat.completions.create(
            model=settings.NVIDIA_TEXT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
        )
        if not resp.choices or not resp.choices[0].message.content:
            raise NvidiaFallbackError("Empty response from NVIDIA")
        return resp.choices[0].message.content
    except RateLimitError as e:
        logger.error("NVIDIA fallback rate limited: %s", e)
        raise NvidiaFallbackError("NVIDIA free tier rate limit reached (40 RPM). Wait and retry.")
    except APITimeoutError as e:
        logger.error("NVIDIA fallback timeout: %s", e)
        raise NvidiaFallbackError("NVIDIA fallback timed out.")
    except APIError as e:
        logger.error("NVIDIA fallback API error: %s", e)
        raise NvidiaFallbackError(f"NVIDIA fallback error: {e.message}")
    except Exception as e:
        logger.error("NVIDIA fallback unexpected error: %s", e)
        raise NvidiaFallbackError(f"NVIDIA fallback failed: {str(e)}")