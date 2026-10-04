import asyncio
import io
import os

STT_MODEL = os.getenv("STT_MODEL", "tiny").strip() or "tiny"
MAX_AUDIO_MB = max(1, int(os.getenv("MAX_AUDIO_MB", "10")))
MAX_AUDIO_SEC = max(30, int(os.getenv("MAX_AUDIO_SEC", "180")))
ENABLE_SER = os.getenv("ENABLE_SER", "false").strip().lower() == "true"
ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
}
_model = None


class AudioValidationError(ValueError):
    """Raised when uploaded audio fails size or type checks."""


class TranscriptionUnavailableError(RuntimeError):
    """Raised when no transcription path is configured."""


def _sniff_kind(data: bytes) -> str | None:
    if data[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "wav"
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "mp3"
    if data[:4] == b"ftyp":
        return "mp4"
    return None


def validate_audio(filename: str, content_type: str, data: bytes) -> None:
    if not data:
        raise AudioValidationError("No audio was received.")
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise AudioValidationError("Use webm, wav, or mp3 audio.")
    if _sniff_kind(data) not in ("webm", "wav", "mp3", "mp4"):
        raise AudioValidationError("That file does not look like audio. Upload webm, wav, or mp3.")
    limit = MAX_AUDIO_MB * 1024 * 1024
    if len(data) > limit:
        raise AudioValidationError(f"Audio is over {MAX_AUDIO_MB}MB. Trim under 3 minutes.")
    if not filename.strip():
        raise AudioValidationError("Audio needs a filename.")


def check_duration(seconds: float) -> None:
    if seconds > MAX_AUDIO_SEC:
        raise AudioValidationError(f"Audio is over {MAX_AUDIO_SEC}s. Trim and retry.")


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise TranscriptionUnavailableError(
            "Transcription is unavailable. Install faster-whisper locally."
        ) from error
    _model = WhisperModel(STT_MODEL, device="cpu", compute_type="int8")
    return _model


async def transcribe_audio(
    data: bytes,
    filename: str,
    content_type: str,
    provider_key: str | None = None,
) -> list[dict[str, float | str]]:
    validate_audio(filename, content_type, data)
    if provider_key:
        raise TranscriptionUnavailableError(
            "Hosted provider transcription is not enabled yet."
        )
    model = _load_model()
    stream = io.BytesIO(data)
    segments, _ = await asyncio.to_thread(model.transcribe, stream, beam_size=1)
    out: list[dict[str, float | str]] = []
    total = 0.0
    for seg in segments:
        total = max(total, float(seg.end))
        out.append({"text": seg.text.strip(), "start": float(seg.start), "end": float(seg.end)})
    check_duration(total)
    return out
