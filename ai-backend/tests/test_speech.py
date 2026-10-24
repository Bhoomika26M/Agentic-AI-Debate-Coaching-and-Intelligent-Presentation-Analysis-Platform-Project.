"""Transcription settings are pinned here, without faster-whisper installed."""

import asyncio
import sys
import types

import pytest

from app import speech

WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 32


class _Segment:
    def __init__(self, text: str, start: float, end: float) -> None:
        self.text = text
        self.start = start
        self.end = end


def _install_fake(monkeypatch, *, failures=None, transcribe_failures=None, segments=None):
    calls = {"init": [], "transcribe": []}
    errors = failures or {}
    decode_errors = transcribe_failures or {}

    class FakeWhisperModel:
        def __init__(self, model, device, compute_type):
            calls["init"].append((model, device, compute_type))
            self.device = device
            error = errors.get(device)
            if error is not None:
                raise error

        def transcribe(self, _stream, **kwargs):
            calls["transcribe"].append(kwargs)
            error = decode_errors.get(self.device)
            if error is not None:
                raise error
            found = segments or [(" hello ", 0.0, 1.2)]
            return (_Segment(*item) for item in found), object()

    module = types.ModuleType("faster_whisper")
    module.WhisperModel = FakeWhisperModel
    monkeypatch.setitem(sys.modules, "faster_whisper", module)
    monkeypatch.setattr(speech, "_model", None)
    return calls


def _configure(monkeypatch, **overrides):
    settings = {
        "STT_MODEL": "distil-large-v3.5",
        "STT_DEVICE": "cpu",
        "STT_COMPUTE_TYPE": "",
        "STT_LANGUAGE": "en",
        "STT_BEAM_SIZE": 5,
        "STT_VAD": False,
    }
    settings.update(overrides)
    for name, value in settings.items():
        monkeypatch.setattr(speech, name, value)


def test_transcription_uses_the_configured_model_and_decoding_options(monkeypatch):
    _configure(monkeypatch)
    calls = _install_fake(monkeypatch)

    segments = asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))

    assert calls["init"] == [("distil-large-v3.5", "cpu", "int8")]
    options = calls["transcribe"][0]
    assert options["beam_size"] == 5
    assert options["language"] == "en"
    assert options["condition_on_previous_text"] is False
    assert options["vad_filter"] is False
    assert segments == [{"text": "hello", "start": 0.0, "end": 1.2}]


def test_auto_language_lets_whisper_detect(monkeypatch):
    _configure(monkeypatch, STT_LANGUAGE="auto")
    calls = _install_fake(monkeypatch)

    asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))

    assert calls["transcribe"][0]["language"] is None


def test_cuda_uses_float16_and_falls_back_to_cpu(monkeypatch):
    _configure(monkeypatch, STT_DEVICE="cuda")
    calls = _install_fake(monkeypatch, failures={"cuda": RuntimeError("missing cuBLAS")})

    asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))

    assert calls["init"] == [
        ("distil-large-v3.5", "cuda", "float16"),
        ("distil-large-v3.5", "cpu", "int8"),
    ]


def test_an_explicit_compute_type_overrides_the_device_default(monkeypatch):
    _configure(monkeypatch, STT_DEVICE="cuda", STT_COMPUTE_TYPE="int8_float16")
    calls = _install_fake(monkeypatch)

    asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))

    assert calls["init"] == [("distil-large-v3.5", "cuda", "int8_float16")]


def test_an_unknown_model_surfaces_a_readable_error(monkeypatch):
    _configure(monkeypatch, STT_MODEL="not-a-model")
    _install_fake(monkeypatch, failures={"cpu": ValueError("Invalid model size")})

    with pytest.raises(speech.TranscriptionUnavailableError, match="not-a-model"):
        asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))


def test_a_missing_cuda_library_retries_on_cpu(monkeypatch):
    _configure(monkeypatch, STT_DEVICE="cuda")
    calls = _install_fake(
        monkeypatch,
        transcribe_failures={"cuda": RuntimeError("Library libcublas.so.12 is not found")},
    )

    segments = asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))

    assert calls["init"] == [
        ("distil-large-v3.5", "cuda", "float16"),
        ("distil-large-v3.5", "cpu", "int8"),
    ]
    assert segments == [{"text": "hello", "start": 0.0, "end": 1.2}]


def test_a_missing_faster_whisper_points_at_the_speech_extra(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(speech, "_model", None)
    monkeypatch.setitem(sys.modules, "faster_whisper", None)

    with pytest.raises(speech.TranscriptionUnavailableError, match=r"uv sync --group stt"):
        asyncio.run(speech.transcribe_audio(WEBM, "talk.webm", "audio/webm"))


def test_transcription_availability_follows_the_installed_extra(monkeypatch):
    monkeypatch.setattr(speech.importlib.util, "find_spec", lambda name: object())
    assert speech.transcription_available() is True

    monkeypatch.setattr(speech.importlib.util, "find_spec", lambda name: None)
    assert speech.transcription_available() is False


def test_transcription_availability_is_false_when_the_import_fails(monkeypatch):
    def missing(name):
        raise ModuleNotFoundError(name)

    monkeypatch.setattr(speech.importlib.util, "find_spec", missing)
    assert speech.transcription_available() is False
