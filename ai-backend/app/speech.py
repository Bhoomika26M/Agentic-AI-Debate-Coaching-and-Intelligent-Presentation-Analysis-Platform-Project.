import asyncio
import importlib.util
import io
import logging
import os

logger = logging.getLogger(__name__)

STT_MODEL = os.getenv("STT_MODEL", "distil-large-v3.5").strip() or "distil-large-v3.5"
STT_DEVICE = os.getenv("STT_DEVICE", "cpu").strip().lower() or "cpu"
STT_COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "").strip()
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "en").strip() or "en"
STT_BEAM_SIZE = max(1, int(os.getenv("STT_BEAM_SIZE", "5")))
STT_VAD = os.getenv("STT_VAD", "false").strip().lower() == "true"
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


def transcription_available() -> bool:
    """True when faster-whisper is installed; never loads the model."""
    try:
        return importlib.util.find_spec("faster_whisper") is not None
    except (ImportError, ValueError):
        return False


def _default_compute_type(device: str) -> str:
    return "float16" if device == "cuda" else "int8"


def _language() -> str | None:
    """None lets Whisper detect the language, same as STT_LANGUAGE=auto."""
    return None if STT_LANGUAGE.lower() in ("", "auto") else STT_LANGUAGE


def _is_missing_cuda_library(error: Exception) -> bool:
    text = str(error).lower()
    return "cublas" in text or "cudnn" in text


def _load_model(device: str | None = None, compute_type: str | None = None):
    global _model
    if _model is not None and device is None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise TranscriptionUnavailableError(
            "Transcription is unavailable. Run `uv sync --group stt` in ai-backend "
            "to install the speech packages, or rebuild the API image."
        ) from error
    target_device = device or STT_DEVICE
    target_compute = compute_type or STT_COMPUTE_TYPE or _default_compute_type(target_device)
    try:
        model = WhisperModel(STT_MODEL, device=target_device, compute_type=target_compute)
    except ValueError as error:
        raise TranscriptionUnavailableError(
            f"STT model '{STT_MODEL}' could not be loaded: {error}"
        ) from error
    except (RuntimeError, OSError) as error:
        if target_device == "cpu":
            raise TranscriptionUnavailableError(
                f"Could not load the STT model: {error}"
            ) from error
        logger.warning(
            "STT device '%s' unusable (%s); falling back to CPU int8.", target_device, error
        )
        model = WhisperModel(STT_MODEL, device="cpu", compute_type="int8")
    _model = model
    return model


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
    options = {
        "beam_size": STT_BEAM_SIZE,
        "language": _language(),
        # Short clips decode independently so a repetition loop cannot seed the next segment.
        "condition_on_previous_text": False,
        "vad_filter": STT_VAD,
    }
    try:
        segments, _ = await asyncio.to_thread(model.transcribe, stream, **options)
    except (RuntimeError, OSError) as error:
        if STT_DEVICE == "cpu" or not _is_missing_cuda_library(error):
            raise
        logger.warning("CUDA libraries unavailable (%s); retrying on CPU int8.", error)
        model = _load_model(device="cpu", compute_type="int8")
        stream.seek(0)
        segments, _ = await asyncio.to_thread(model.transcribe, stream, **options)
    out: list[dict[str, float | str]] = []
    total = 0.0
    for seg in segments:
        total = max(total, float(seg.end))
        out.append({"text": seg.text.strip(), "start": float(seg.start), "end": float(seg.end)})
    check_duration(total)
    return out
