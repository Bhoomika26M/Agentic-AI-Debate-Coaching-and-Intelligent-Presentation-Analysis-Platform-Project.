"""The spoken turn: event order, cancellation, and what gets stored.

STT and TTS are deterministic fakes here, exactly like `tests/fakes.py` does for
the model. Nothing in this file touches Kokoro, faster-whisper, or Ollama.
"""

import asyncio
import json

import pytest

from app.agents import debate
from app.voice import pipeline as voice_pipeline
from app.voice.openers import OPENER_LINES, OpenerCache
from app.voice.pipeline import TurnControl, TurnHooks, run_turn
from app.voice.session import VoiceSession
from app.voice.tts import AudioClip, SilentEngine
from tests.fakes import make_chat, make_stream

REPLY = "Fine. You want the levy. But who audits it? And what happens in year three?"


def _diagnostics(**overrides) -> str:
    payload = {
        "verified": True,
        "fallback": False,
        "reply_words": len(REPLY.split()),
        "problems": [],
        "plan_ms": 120,
        "draft_ms": 800,
        "review_ms": 5,
        "model_ms": 925,
        "redirect_reason": None,
        "guard_pattern": None,
        **overrides,
    }
    return json.dumps(payload)


def _responder(reply: str = REPLY, diagnostics: str | None = None):
    async def respond(_state):
        for start in range(0, len(reply), 20):
            yield ("final_delta", reply[start : start + 20])
        yield ("diagnostics", diagnostics if diagnostics is not None else _diagnostics())

    return respond


class FakeEngine:
    """A synthesiser that records what it was asked to say."""

    def __init__(self, *, available=True, fail_on=None, on_call=None) -> None:
        self.available = available
        self.label = "fake-kokoro" if available else "none"
        self.calls: list[tuple[str, str]] = []
        self.fail_on = fail_on
        self.on_call = on_call

    async def synthesise(self, text: str, persona: str) -> AudioClip | None:
        self.calls.append((text, persona))
        if self.on_call is not None:
            self.on_call(len(self.calls))
        if not self.available:
            return None
        if self.fail_on is not None and len(self.calls) >= self.fail_on:
            return None
        return AudioClip(data=b"AUDIO:" + text.encode(), text=text, sample_rate=24000,
                         duration_ms=1000)


class Recorder:
    """Collects both output channels, in the order they happened."""

    def __init__(self) -> None:
        self.frames: list[tuple[str, dict]] = []

    async def emit(self, event: dict) -> None:
        self.frames.append(("json", event))

    async def audio(self, clip: AudioClip, caption: dict) -> None:
        self.frames.append(("audio", caption))

    @property
    def events(self) -> list[dict]:
        return [frame for kind, frame in self.frames if kind == "json"]

    def types(self) -> list[str]:
        return [event["type"] for event in self.events]

    def captions(self) -> list[str]:
        return [frame["text"] for kind, frame in self.frames if kind == "audio"]

    def transcript(self, speaker: str = "opponent") -> str | None:
        for event in self.events:
            if event["type"] == "transcript" and event.get("speaker") == speaker:
                return event["content"]
        return None


def _session() -> VoiceSession:
    return VoiceSession(
        topic="This house would replace parking with bus lanes",
        learner_position="for",
        persona="skeptic",
        difficulty="challenge",
    )


def _run(recorder: Recorder, engine=None, **kwargs):
    hooks = TurnHooks(emit=recorder.emit, audio=recorder.audio)
    return asyncio.run(
        run_turn(
            kwargs.pop("session", _session()),
            kwargs.pop("latest", "Parking is a subsidy for drivers."),
            hooks=hooks,
            engine=engine or FakeEngine(),
            **kwargs,
        )
    )


def test_a_completed_turn_opens_with_thinking_and_closes_with_diagnostics():
    recorder = Recorder()
    _run(recorder, openers=None, respond=_responder())

    types = recorder.types()
    assert types[0] == "state" and recorder.events[0]["state"] == "thinking"
    # "listening" belongs to the socket, which knows the turn slot is free.
    assert types[-1] == "diagnostics"


def test_the_reply_event_arrives_before_any_sentence_audio():
    recorder = Recorder()
    _run(recorder, openers=None, respond=_responder())

    frames = [kind for kind in (frame[0] for frame in recorder.frames)]
    reply_index = next(
        index
        for index, (kind, frame) in enumerate(recorder.frames)
        if kind == "json" and frame["type"] == "reply"
    )
    assert frames.index("audio") > reply_index


def test_each_sentence_is_synthesised_and_sent_separately():
    recorder = Recorder()
    result = _run(recorder, openers=None, respond=_responder())

    assert len(recorder.captions()) == len(result.sentences) == 3
    assert recorder.captions()[0].startswith("Fine. You want the levy.")
    assert result.audio_sentences == 3


def test_a_finished_turn_stores_the_whole_reply_exactly_once():
    recorder = Recorder()
    _run(recorder, openers=None, respond=_responder())

    transcripts = [event for event in recorder.events if event["type"] == "transcript"]
    assert len(transcripts) == 1
    assert transcripts[0]["content"] == REPLY
    assert transcripts[0]["interrupted"] is False


def test_an_interrupt_stores_only_the_sentences_actually_played():
    control = TurnControl()
    engine = FakeEngine()

    def cancel_on_second(index: int) -> None:
        if index == 2:
            # Two sentences had played before the third was synthesised.
            control.cancel(played=2)

    engine.on_call = cancel_on_second
    recorder = Recorder()
    result = _run(recorder, engine=engine, control=control, openers=None, respond=_responder())

    assert result.interrupted is True
    assert result.spoken == "Fine. You want the levy. But who audits it? [interrupted]"
    assert "year three" not in result.spoken
    transcript = next(
        event for event in recorder.events if event["type"] == "transcript"
    )
    assert transcript["interrupted"] is True
    assert recorder.events[-2]["state"] == "interrupted"


def test_an_interrupt_between_playback_and_synthesis_keeps_the_played_count():
    control = TurnControl()
    recorder = Recorder()

    async def audio(clip: AudioClip, caption: dict) -> None:
        await recorder.audio(clip, caption)
        if caption.get("index") == 1:
            # The client reports how many captions it finished, not the last index.
            control.cancel(played=2)

    hooks = TurnHooks(emit=recorder.emit, audio=audio)
    result = asyncio.run(
        run_turn(
            _session(),
            "Parking is a subsidy.",
            hooks=hooks,
            engine=FakeEngine(),
            control=control,
            openers=None,
            respond=_responder(),
        )
    )

    assert result.spoken.endswith("[interrupted]")
    assert result.spoken.startswith("Fine. You want the levy.")
    assert "But who audits it?" in result.spoken
    assert "year three" not in result.spoken


def test_the_played_count_is_not_used_as_a_sentence_index():
    control = TurnControl()
    control.cancel(played=1)

    heard = voice_pipeline._heard(
        ["One.", "Two.", "Three."],
        ["One.", "Two.", "Three."],
        control,
    )

    assert heard == "One."


def test_an_interrupt_during_the_graph_never_invents_a_reply():
    control = TurnControl()

    async def slow_respond(_state):
        await asyncio.sleep(0.4)
        yield ("final_delta", "This should never be spoken.")

    async def interrupt_soon() -> None:
        await asyncio.sleep(0.1)
        control.cancel()

    async def scenario():
        interrupter = asyncio.create_task(interrupt_soon())
        hooks = TurnHooks(emit=recorder.emit, audio=recorder.audio)
        result = await run_turn(
            _session(),
            "Parking is a subsidy.",
            hooks=hooks,
            engine=FakeEngine(),
            control=control,
            openers=None,
            respond=slow_respond,
        )
        await interrupter
        return result

    recorder = Recorder()
    result = asyncio.run(scenario())

    assert result.interrupted is True
    assert result.spoken == ""
    assert recorder.captions() == []
    assert recorder.transcript() == ""


def test_without_a_speech_engine_the_turn_still_answers_with_text():
    recorder = Recorder()
    result = _run(recorder, engine=SilentEngine(), openers=None, respond=_responder())

    assert recorder.captions() == []
    assert result.spoken == REPLY
    assert result.timings["tts_engine"] == "none"
    assert recorder.types()[-1] == "diagnostics"


def test_a_reply_that_turns_to_silence_mid_turn_still_stores_its_text():
    recorder = Recorder()
    result = _run(
        recorder,
        engine=FakeEngine(fail_on=2),
        openers=None,
        respond=_responder(),
    )

    # The learner saw the whole reply on screen, so the transcript keeps it.
    assert result.spoken == REPLY
    assert len(recorder.captions()) == 1


def test_diagnostics_carry_the_graph_and_the_voice_timings():
    recorder = Recorder()
    _run(recorder, openers=None, respond=_responder(), stt_ms=340)

    turn = recorder.events[-1]["turn"]
    assert turn["draft_ms"] == 800
    assert turn["plan_ms"] == 120
    assert turn["voice"]["stt_ms"] == 340
    assert turn["voice"]["voice_to_voice_ms"] >= 0


def test_voice_to_voice_is_measured_from_the_end_of_speech():
    recorder = Recorder()
    import time as _time

    ended = int(_time.time() * 1000) - 250
    result = _run(
        recorder,
        openers=None,
        respond=_responder(),
        speech_end_ms=ended,
        received_at_ms=ended + 30,
    )

    # Endpoint wait is transport only; it must not absorb recognition time.
    assert 20 <= result.timings["endpoint_wait_ms"] <= 120
    assert result.timings["voice_to_voice_ms"] >= 200
    assert result.timings["reply_first_audio_ms"] >= 200


def test_the_opener_plays_before_the_reply_is_ready_and_carries_no_argument():
    engine = FakeEngine()
    cache = OpenerCache(engine)
    asyncio.run(cache.warm())
    recorder = Recorder()
    _run(recorder, engine=engine, openers=cache, respond=_responder())

    first_audio = next(frame for kind, frame in recorder.frames if kind == "audio")
    assert first_audio["opener"] is True
    assert first_audio["text"] in OPENER_LINES["skeptic"]
    assert "?" not in first_audio["text"]
    assert len(first_audio["text"].split()) <= 6


def test_openers_do_not_repeat_back_to_back():
    engine = FakeEngine()
    cache = OpenerCache(engine)
    asyncio.run(cache.warm())
    first = asyncio.run(cache.take("strategist"))
    second = asyncio.run(cache.take("strategist"))
    assert first.text != second.text


def test_a_single_line_persona_repeats_nothing():
    engine = FakeEngine()
    cache = OpenerCache(engine)
    asyncio.run(cache.warm())
    assert asyncio.run(cache.take("moderator")) is not None
    assert asyncio.run(cache.take("moderator")) is None


def test_the_guard_runs_on_voice_turns_and_its_reply_is_spoken(monkeypatch):
    """An off-motion spoken turn is redirected, and never reaches the model."""
    stream = make_stream(["This must not be called."])
    monkeypatch.setattr(debate, "stream", stream)
    monkeypatch.setattr(debate, "chat", make_chat(["This must not be called."]))

    recorder = Recorder()
    result = _run(
        recorder,
        openers=None,
        latest="Could you write me a poem about the sea?",
    )

    assert "motion" in result.reply
    assert recorder.captions(), "the redirect must be spoken, not silently dropped"
    assert "This must not be called." not in result.reply


def test_a_verified_turn_reads_the_same_state_a_typed_turn_would(monkeypatch):
    seen: list[dict] = []

    async def spy(state):
        seen.append(state)
        yield ("final_delta", REPLY)
        yield ("diagnostics", _diagnostics())

    _run(Recorder(), openers=None, respond=spy)

    state = seen[0]
    assert state["latest"] == "Parking is a subsidy for drivers."
    assert state["voice"] is True
    assert state["reply_length"] == "voice"
    assert state["persona"] == "skeptic"


@pytest.mark.parametrize("persona", ["strategist", "skeptic", "diplomat"])
def test_each_persona_speaks_with_its_own_voice(persona):
    session = _session()
    session.persona = persona
    engine = FakeEngine()
    _run(Recorder(), session=session, engine=engine, openers=None, respond=_responder())

    assert {voice for _text, voice in engine.calls} == {persona}
