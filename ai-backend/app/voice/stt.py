"""Transcription for voice turns, on top of the existing `app.speech` model.

Two differences from the upload path:

* word-level timestamps, so the delivery signals can measure pauses between
  words rather than between segments;
* the decoder's own confidence, which the recognition gate needs to drop a clip
  that contained no speech.

The model is a separate instance because a short conversational turn wants a
different checkpoint and beam size from a three-minute presentation. Set
``VOICE_STT_MODEL`` to change it; the default is the app's STT model so a
machine with one model downloaded still works.
"""

import asyncio
import io
import logging
import os

from ..speech import (
    STT_LANGUAGE,
    TranscriptionTimeoutError,
    TranscriptionUnavailableError,
    probe_duration,
    validate_audio,
)
from ..speech import _transcribe_lock as transcription_lock

logger = logging.getLogger(__name__)

# A spoken turn is a few seconds long, so the voice path prefers a small,
# fast checkpoint over the upload path's accuracy-first model. Measured in
# docs/VOICE.md; override with VOICE_STT_MODEL.
VOICE_STT_MODEL = os.getenv("VOICE_STT_MODEL", "").strip() or "base.en"
VOICE_STT_DEVICE = os.getenv("VOICE_STT_DEVICE", "cpu").strip().lower() or "cpu"
VOICE_STT_BEAM_SIZE = max(1, int(os.getenv("VOICE_STT_BEAM_SIZE", "1")))
MAX_UTTERANCE_SEC = max(5, int(os.getenv("VOICE_MAX_SEC", "45")))
MAX_VOICE_TRANSCRIBE_SEC = max(5, int(os.getenv("VOICE_TRANSCRIBE_SEC", "30")))

_model = None


def voice_model_name() -> str:
    return VOICE_STT_MODEL


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise TranscriptionUnavailableError(
            "Speech recognition is unavailable. Run `uv sync --group stt` in ai-backend."
        ) from error
    try:
        _model = WhisperModel(VOICE_STT_MODEL, device=VOICE_STT_DEVICE, compute_type="int8")
    except (ValueError, RuntimeError, OSError) as error:
        raise TranscriptionUnavailableError(
            f"Voice speech model '{VOICE_STT_MODEL}' could not be loaded: {error}"
        ) from error
    logger.info("Voice transcription loaded %s on %s int8.", VOICE_STT_MODEL, VOICE_STT_DEVICE)
    return _model


def _language() -> str | None:
    return None if STT_LANGUAGE.lower() in ("", "auto") else STT_LANGUAGE


def _decode(model, data: bytes) -> list[dict]:
    """Consume the lazy generator inside the worker thread."""
    options = {
        "beam_size": VOICE_STT_BEAM_SIZE,
        "language": _language(),
        "condition_on_previous_text": False,
        "word_timestamps": True,
        "vad_filter": False,
    }
    with transcription_lock:
        segments, _info = model.transcribe(io.BytesIO(data), **options)
        decoded = []
        for segment in segments:
            words = [
                {"text": str(word.word).strip(), "start": float(word.start), "end": float(word.end)}
                for word in (getattr(segment, "words", None) or [])
                if str(getattr(word, "word", "")).strip()
            ]
            decoded.append(
                {
                    "text": str(segment.text).strip(),
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "no_speech_prob": float(getattr(segment, "no_speech_prob", 0.0) or 0.0),
                    "avg_logprob": float(getattr(segment, "avg_logprob", 0.0) or 0.0),
                    "words": words,
                }
            )
        return decoded


def _pack(decoded: list[dict]) -> dict:
    text = " ".join(segment["text"] for segment in decoded if segment["text"]).strip()
    words: list[dict] = []
    for segment in decoded:
        if segment["words"]:
            words.extend(segment["words"])
        elif segment["text"]:
            # Word timestamps can be absent on a very short clip; one span still
            # lets the delivery signals measure pace.
            words.append(
                {"text": segment["text"], "start": segment["start"], "end": segment["end"]}
            )
    duration = max((word["end"] for word in words), default=0.0)
    return {
        "text": text,
        "words": words,
        "no_speech_prob": max((s["no_speech_prob"] for s in decoded), default=None),
        "avg_logprob": min((s["avg_logprob"] for s in decoded), default=None),
        "duration": duration,
    }


async def transcribe_utterance(
    data: bytes,
    *,
    filename: str = "utterance.wav",
    content_type: str = "audio/wav",
) -> dict:
    """Transcribe one learner utterance, keeping its confidence and word spans."""
    validate_audio(filename, content_type, data)
    known = probe_duration(data)
    if known is not None and known > MAX_UTTERANCE_SEC:
        raise TranscriptionUnavailableError(
            f"That turn is {known:.0f}s long. Keep spoken turns under {MAX_UTTERANCE_SEC}s."
        )
    # In a thread: the first load downloads and initialises a checkpoint, and a
    # blocked event loop drops the learner's socket mid-turn.
    model = await asyncio.to_thread(_load_model)
    try:
        decoded = await asyncio.wait_for(
            asyncio.to_thread(_decode, model, data),
            timeout=MAX_VOICE_TRANSCRIBE_SEC,
        )
    except TimeoutError as error:
        raise TranscriptionTimeoutError(
            f"Speech recognition took longer than {MAX_VOICE_TRANSCRIBE_SEC}s."
        ) from error
    return _pack(decoded)


# The browser resamples to this rate before sending; pinned here for the client.
EXPECTED_SAMPLE_RATE = 16000
