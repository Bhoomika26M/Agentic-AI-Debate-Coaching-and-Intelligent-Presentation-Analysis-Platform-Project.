"""Kokoro-82M speech synthesis, in process, on the CPU.

Why in process: the laptop GPU is 6 GB and shared with the 4B debate model. A
second GPU resident would push the LLM into system memory, so speech runs on the
CPU (measured cost is in docs/VOICE.md). Why Kokoro: Apache-2.0 weights and
runtime, 82M parameters, and 54 English voices that can be blended.

The engine is optional. If the model files, espeak-ng, or onnxruntime are
missing, ``available`` is False and the browser falls back to its own
``speechSynthesis``; the debate still works, it is just silent on the server.
"""

import asyncio
import io
import logging
import os
import re
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "models/kokoro/kokoro-v1.0.onnx"
DEFAULT_VOICES = "models/kokoro/voices-v1.0.bin"
# espeak-ng 1.50+ on Debian/Arch keeps its data here; kokoro's bundled copy is
# not always complete, so the system copy is preferred when it exists.
SYSTEM_ESPEAK_DATA = "/usr/share/espeak-ng-data"
SYSTEM_ESPEAK_LIB = "libespeak-ng.so.1"


@dataclass(frozen=True)
class VoiceProfile:
    """A persona's speaking identity: which voices, how they blend, how fast."""

    names: tuple[str, ...]
    weights: tuple[float, ...]
    speed: float
    description: str

    def __post_init__(self) -> None:
        if len(self.names) != len(self.weights):
            raise ValueError("every blended voice needs a weight")
        if abs(sum(self.weights) - 1.0) > 0.001:
            raise ValueError("blend weights must sum to 1")


# Chosen by listening to single voices and then to blends; the choice is
# recorded in docs/VOICE.md. Speeds differ so the three opponents are separable
# even when the words are not visible.
VOICES: dict[str, VoiceProfile] = {
    "strategist": VoiceProfile(
        ("am_michael", "am_onyx"),
        (0.7, 0.3),
        0.94,
        "lower, even, deliberate",
    ),
    "skeptic": VoiceProfile(
        ("af_heart", "af_nicole"),
        (0.65, 0.35),
        1.08,
        "brighter and quicker",
    ),
    "diplomat": VoiceProfile(
        ("bf_emma", "bf_isabella"),
        (0.7, 0.3),
        0.9,
        "unhurried and warm",
    ),
    "moderator": VoiceProfile(("am_puck",), (1.0,), 1.0, "neutral announcer"),
}

_MARKUP = re.compile(r"[*_`#>]+")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
_CLAUSE_END = re.compile(r"(?<=[,;:])\s+")


@dataclass(frozen=True)
class AudioClip:
    """One synthesised sentence as a WAV file, ready to send as a binary frame."""

    data: bytes
    text: str
    sample_rate: int
    duration_ms: int


class SpeechEngine(Protocol):
    """What the voice pipeline needs from a synthesiser. Fakes implement this."""

    available: bool
    label: str

    async def synthesise(self, text: str, persona: str) -> AudioClip | None: ...


def strip_markup(text: str) -> str:
    """Speech reads the words, not the formatting."""
    return _MARKUP.sub(" ", text or "").strip()


def split_sentences(text: str, *, max_words: int = 34, min_words: int = 3) -> list[str]:
    """Split a reply into speakable sentences.

    Sentences are the unit of synthesis, so the first one can start playing
    while the rest render. Very short fragments are merged forward so a reply is
    not read out as a series of one-word clips, and a long sentence is cut at a
    comma rather than dropped.
    """
    cleaned = " ".join(strip_markup(text).split())
    if not cleaned:
        return []
    merged: list[str] = []
    for part in (piece.strip() for piece in _SENTENCE_END.split(cleaned)):
        if not part:
            continue
        if merged and len(part.split()) < min_words:
            merged[-1] = f"{merged[-1]} {part}"
        else:
            merged.append(part)
    # A short opening fragment ("Fine.") joins the sentence that follows it.
    if len(merged) > 1 and len(merged[0].split()) < min_words:
        merged[1] = f"{merged[0]} {merged[1]}"
        merged.pop(0)
    sentences: list[str] = []
    for part in merged:
        sentences.extend(_split_long(part, max_words))
    return [sentence for sentence in sentences if sentence.strip()]


def _split_long(sentence: str, max_words: int) -> list[str]:
    if len(sentence.split()) <= max_words:
        return [sentence]
    chunks: list[str] = []
    current = ""
    for clause in _CLAUSE_END.split(sentence):
        candidate = f"{current} {clause}".strip()
        if current and len(candidate.split()) > max_words:
            chunks.append(current)
            current = clause
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def wav_bytes(samples, sample_rate: int) -> bytes:
    """16-bit PCM mono WAV. Small, and every browser decodes it natively."""
    import numpy as np

    array = np.asarray(samples, dtype=np.float32)
    pcm = np.clip(array, -1.0, 1.0)
    pcm = (pcm * 32767).astype(np.int16)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())
    return buffer.getvalue()


class KokoroEngine:
    """Lazy, single-flight Kokoro wrapper. One ONNX session for the process."""

    def __init__(
        self,
        model_path: str | None = None,
        voices_path: str | None = None,
        *,
        enabled: bool = True,
    ) -> None:
        self.model_path = model_path or os.getenv("KOKORO_MODEL", DEFAULT_MODEL)
        self.voices_path = voices_path or os.getenv("KOKORO_VOICES", DEFAULT_VOICES)
        self._enabled = enabled
        self._kokoro = None
        self._lock = asyncio.Lock()
        self._blends: dict[str, object] = {}
        self.label = "kokoro-82m-cpu"
        self.available = enabled and self._files_present()

    def _files_present(self) -> bool:
        return Path(self.model_path).is_file() and Path(self.voices_path).is_file()

    def _load_sync(self):
        from kokoro_onnx import Kokoro
        from kokoro_onnx.config import EspeakConfig

        data_path = os.getenv("ESPEAK_DATA_PATH", "").strip() or (
            SYSTEM_ESPEAK_DATA if Path(SYSTEM_ESPEAK_DATA).is_dir() else ""
        )
        lib_path = os.getenv("ESPEAK_LIBRARY", "").strip() or SYSTEM_ESPEAK_LIB
        config = EspeakConfig(data_path=data_path, lib_path=lib_path) if data_path else None
        return Kokoro(self.model_path, self.voices_path, espeak_config=config)

    async def _ensure(self):
        if self._kokoro is not None:
            return self._kokoro
        async with self._lock:
            if self._kokoro is None:
                self._kokoro = await asyncio.to_thread(self._load_sync)
                logger.info("Kokoro speech engine loaded from %s", self.model_path)
        return self._kokoro

    def _voice(self, persona: str):
        import numpy as np

        profile = VOICES.get(persona, VOICES["skeptic"])
        key = profile.names
        if key in self._blends:
            return self._blends[key]
        kokoro = self._kokoro
        available = getattr(kokoro, "voices", {}) or {}
        parts = []
        for name, weight in zip(profile.names, profile.weights, strict=True):
            voicing = available.get(name)
            if voicing is None:
                continue
            parts.append((np.asarray(voicing, dtype=np.float32), weight))
        if not parts:
            blend = profile.names[0]
        else:
            total = sum(weight for _, weight in parts)
            blended = sum(array * weight for array, weight in parts) / total
            blend = blended.astype(np.float32)
        self._blends[key] = blend
        return blend

    async def synthesise(self, text: str, persona: str) -> AudioClip | None:
        """Render one sentence. Returns None when speech is unavailable."""
        if not self.available:
            return None
        spoken = " ".join(strip_markup(text).split())
        if not spoken:
            return None
        try:
            kokoro = await self._ensure()
            profile = VOICES.get(persona, VOICES["skeptic"])
            voice = self._voice(persona)
            samples, rate = await asyncio.to_thread(
                kokoro.create,
                spoken,
                voice=voice,
                speed=profile.speed,
                lang="en-us",
            )
            data = wav_bytes(samples, rate)
            duration_ms = int(round(len(samples) / rate * 1000)) if rate else 0
            return AudioClip(data=data, text=spoken, sample_rate=rate, duration_ms=duration_ms)
        except Exception as error:  # noqa: BLE001 - speech must never break a turn
            logger.warning("Kokoro synthesis failed (%s); continuing without audio.", error)
            self.available = False
            return None


class SilentEngine:
    """The 'no TTS' configuration: every sentence returns None, and the client speaks."""

    available = False
    label = "none"

    async def synthesise(self, text: str, persona: str) -> AudioClip | None:
        return None


def build_engine() -> SpeechEngine:
    """The engine for this process, honouring VOICE_TTS=off."""
    mode = os.getenv("VOICE_TTS", "auto").strip().lower()
    if mode in ("off", "none", "0", "false"):
        logger.info("Voice synthesis disabled by VOICE_TTS=%s", mode)
        return SilentEngine()
    return KokoroEngine()
