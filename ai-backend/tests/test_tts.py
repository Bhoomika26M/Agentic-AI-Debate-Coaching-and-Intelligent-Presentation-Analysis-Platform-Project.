"""Speech synthesis must survive one bad sentence without disabling itself."""

import asyncio

from app.voice import tts


class _Kokoro:
    def __init__(self) -> None:
        self.voices: dict = {}
        self.calls = 0

    def create(self, text, **_kwargs):
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("one bad sentence")
        return [0.0] * 2400, 24000


def _engine(tmp_path):
    model = tmp_path / "kokoro.onnx"
    voices = tmp_path / "voices.bin"
    model.write_bytes(b"model")
    voices.write_bytes(b"voices")
    return tts.KokoroEngine(str(model), str(voices))


def test_a_failed_clip_does_not_disable_later_synthesis(tmp_path):
    engine = _engine(tmp_path)
    fake = _Kokoro()

    async def use_fake():
        return fake

    engine._ensure = use_fake
    engine._voice = lambda _persona: "voice"

    first = asyncio.run(engine.synthesise("A sentence that fails.", "skeptic"))
    second = asyncio.run(engine.synthesise("A sentence that works.", "skeptic"))

    assert first is None
    assert second is not None
    assert second.text == "A sentence that works."
    assert engine.available is True


def test_british_profiles_use_british_english():
    assert tts.VOICES["diplomat"].lang == "en-gb"
    assert tts.VOICES["strategist"].lang == "en-us"
    assert tts.VOICES["skeptic"].lang == "en-us"
