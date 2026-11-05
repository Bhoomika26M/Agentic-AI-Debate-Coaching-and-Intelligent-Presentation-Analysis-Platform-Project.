"""Voice-turn limits and the error type the socket can report safely."""

import asyncio

import pytest

from app import speech
from app.voice import stt

WAV = b"RIFF\x00\x00\x00\x00WAVEfmt " + b"\x00" * 64


def test_the_default_spoken_turn_limit_exceeds_the_old_45_second_cap():
    assert stt.MAX_UTTERANCE_SEC > 45


def test_an_over_length_utterance_is_a_validation_error_not_an_outage(monkeypatch):
    monkeypatch.setattr(stt, "probe_duration", lambda _data: stt.MAX_UTTERANCE_SEC + 1)

    def must_not_load():
        raise AssertionError("the model must not load for a clip that is too long")

    monkeypatch.setattr(stt, "_load_model", must_not_load)

    with pytest.raises(speech.AudioValidationError, match="Keep spoken turns under"):
        asyncio.run(stt.transcribe_utterance(WAV))
