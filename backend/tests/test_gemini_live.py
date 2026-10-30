from pathlib import Path
import pytest

from app.services.llm_service import LLMService


def _load_live_gemini_key() -> str | None:
    for env_candidate in [Path(".env"), Path("backend/.env"), Path("../backend/.env")]:
        if env_candidate.exists():
            for line in env_candidate.read_text(encoding="utf-8").splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    key = line.split("=", 1)[1].strip()
                    if key and "PASTE_YOUR" not in key:
                        return key
    return None


def test_gemini_provider_live_response():
    """Verify Gemini integration generates a live debate opponent rebuttal using the configured API key."""
    live_key = _load_live_gemini_key()
    if not live_key:
        pytest.skip("No real GEMINI_API_KEY found in .env; skipping live test.")

    service = LLMService()
    service.api_key = live_key
    service.provider = "gemini"
    from app.core.config import settings
    service.model = settings.gemini_model

    status = service.get_provider_status()
    assert status["is_ready"] is True
    assert status["provider"] == "gemini"
    assert "gemini" in status["model"].lower()

    # Sparring prompt to verify live debate rebuttal generation
    reply = service.generate_debate_response(
        topic="Should public transit be completely free for all citizens?",
        debate_rules="1-on-1 debate format. Respond concisely in 2-4 sentences, 40-80 words maximum.",
        user_position="for",
        user_argument="Free transit reduces traffic congestion, decreases carbon emissions, and ensures equitable access to transportation for low-income residents.",
        debate_history=["for (user): Free public transit has clear environmental and social benefits."],
        ai_position="against",
    )

    assert reply is not None, "Expected Gemini to generate a response"
    assert isinstance(reply, str), "Expected response to be string"
    word_count = len(reply.split())
    assert 15 <= word_count <= 95, f"Expected short crisp rebuttal (40-80 words), got {word_count} words: '{reply}'"
    print(f"\n[LIVE GEMINI VERIFIED] AI Rebuttal received ({len(reply)} chars, {word_count} words):")
    print(reply)
