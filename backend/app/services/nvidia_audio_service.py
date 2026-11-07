"""
NVIDIA Whisper Large v3 audio fallback service.
Called ONLY when Gemini audio transcription fails (503/429/timeout).
"""
import logging
import riva.client
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class NvidiaAudioError(Exception):
    """Raised when Whisper fallback fails."""
    pass


def _build_asr_service() -> riva.client.ASRService:
    if not settings.NVIDIA_API_KEY:
        raise NvidiaAudioError("NVIDIA_API_KEY is not configured")

    auth = riva.client.Auth(
        uri="grpc.nvcf.nvidia.com:443",
        use_ssl=True,
        metadata_args=[
            ["function-id", settings.NVIDIA_ASR_FUNCTION_ID],  # Whisper Large v3
            ["authorization", f"Bearer {settings.NVIDIA_API_KEY}"],
        ],
    )
    return riva.client.ASRService(auth)


def transcribe_with_whisper(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribe audio via NVIDIA Whisper Large v3.
    """
    try:
        asr_service = _build_asr_service()

        config = riva.client.RecognitionConfig(
            language_code="en",        # Whisper uses "en", not "en-US"
            max_alternatives=1,
        )

        response = asr_service.offline_recognize(audio_bytes, config)

        if not response.results or not response.results[0].alternatives:
            raise NvidiaAudioError("Whisper returned an empty transcription")

        transcript = response.results[0].alternatives[0].transcript
        if not transcript or not transcript.strip():
            raise NvidiaAudioError("Whisper returned a blank transcript")

        logger.info("Whisper fallback transcribed %d characters", len(transcript))
        return transcript.strip()

    except NvidiaAudioError:
        raise
    except Exception as e:
        logger.error("Whisper fallback failed: %s", e)
        raise NvidiaAudioError(f"Whisper fallback error: {str(e)}")
