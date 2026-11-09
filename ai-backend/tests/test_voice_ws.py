"""The `/ws/voice` socket: auth, limits, the gate, and frame ordering.

The speech model and the speech engine are replaced with fakes; the debate graph
is replaced with a deterministic responder that mirrors `respond_stream`'s
event shape. Nothing here needs Ollama, faster-whisper, or Kokoro.
"""

import json
from contextlib import contextmanager

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app import main
from app.auth import require_token
from app.rate_limit import SlidingWindowLimiter, model_limiter, request_limiter
from app.voice import routes
from app.voice.openers import OpenerCache
from app.voice.pipeline import run_turn as run_voice_turn
from app.voice.tts import AudioClip

REPLY = "You want the levy. But who audits it? And what happens in year three?"


@pytest.fixture(autouse=True)
def guest_mode(monkeypatch):
    """A local .env may enable REQUIRE_AUTH; the guest path is what these test."""
    import app.auth as auth

    monkeypatch.setattr(auth, "REQUIRE_AUTH", False)


@pytest.fixture()
def client(monkeypatch) -> TestClient:
    model_limiter.reset()
    request_limiter.reset()
    # Starting the app must not load a 3.4 GB model just to open a socket.
    monkeypatch.setattr(main, "WARMUP_ENABLED", False)
    # The app only trusts its configured hosts; "testserver" is not one of them.
    return TestClient(main.app, base_url="http://127.0.0.1")


class FakeEngine:
    available = True
    label = "fake-kokoro"

    def __init__(self, delay: float = 0.0) -> None:
        self.delay = delay

    async def synthesise(self, text: str, persona: str) -> AudioClip | None:
        if self.delay:
            import asyncio

            await asyncio.sleep(self.delay)
        return AudioClip(data=b"RIFF" + text.encode(), text=text, sample_rate=24000,
                         duration_ms=800)


def _fake_transcription(text: str, **overrides):
    async def transcribe(_data, **_kwargs):
        payload = {
            "text": text,
            "words": [
                {"text": word, "start": index * 0.3, "end": index * 0.3 + 0.25}
                for index, word in enumerate(text.split())
            ],
            "no_speech_prob": 0.01,
            "avg_logprob": -0.2,
            "duration": max(0.4, len(text.split()) * 0.3),
        }
        payload.update(overrides)
        return payload

    return transcribe


def _fake_responder(monkeypatch):
    async def respond(_state):
        for start in range(0, len(REPLY), 18):
            yield ("final_delta", REPLY[start : start + 18])
        yield (
            "diagnostics",
            json.dumps(
                {
                    "verified": True,
                    "fallback": False,
                    "reply_words": len(REPLY.split()),
                    "problems": [],
                    "plan_ms": 90,
                    "draft_ms": 700,
                    "review_ms": 4,
                }
            ),
        )

    monkeypatch.setattr(routes, "run_turn", _wrap_run_turn(monkeypatch, respond))


def _wrap_run_turn(_monkeypatch, respond):
    async def wrapper(*args, **kwargs):
        kwargs["respond"] = respond
        return await run_voice_turn(*args, **kwargs)

    return wrapper


def _prepare(
    monkeypatch,
    text: str = "Parking is a subsidy for drivers, so who pays?",
    delay: float = 0.0,
):
    engine = FakeEngine(delay=delay)
    monkeypatch.setattr(routes, "_engine", engine)
    monkeypatch.setattr(routes, "_openers", OpenerCache(engine))
    monkeypatch.setattr(routes, "transcribe_utterance", _fake_transcription(text))
    _fake_responder(monkeypatch)
    return engine


WAV = b"RIFF\x00\x00\x00\x00WAVEfmt " + b"\x00" * 64


@contextmanager
def _connect(
    client,
    path: str = "/ws/voice",
    origin: str | None = None,
    token: str | None = None,
):
    """Connect, authenticate in the first frame, and wait for the ack."""
    headers = {"host": "127.0.0.1"}
    if origin:
        headers["origin"] = origin
    with client.websocket_connect(path, headers=headers) as socket:
        payload = {"type": "auth"}
        if token is not None:
            payload["token"] = token
        socket.send_json(payload)
        assert socket.receive_json()["type"] == "authenticated"
        yield socket


def _drain(socket) -> list[dict]:
    """Read frames until the socket is listening again, keeping JSON events only."""
    events: list[dict] = []
    while True:
        frame = socket.receive()
        if not frame.get("text"):
            continue
        event = json.loads(frame["text"])
        events.append(event)
        if event["type"] == "state" and event.get("state") == "listening":
            return events


def _start(socket) -> dict:
    assert socket.receive_json()["type"] == "ready"
    socket.send_json(
        {
            "type": "start",
            "topic": "This house would replace parking with bus lanes",
            "learner_position": "for",
            "persona": "skeptic",
            "difficulty": "challenge",
        }
    )
    return socket.receive_json()


def _speak(socket) -> list[dict]:
    """Send one utterance and read events until the opponent starts listening again."""
    socket.send_json({"type": "utterance_start", "speech_end_ms": 1_700_000_000_000})
    socket.send_bytes(WAV)
    events: list[dict] = []
    while True:
        frame = socket.receive()
        if frame.get("text"):
            event = json.loads(frame["text"])
            events.append(event)
            if event["type"] == "state" and event["state"] == "listening":
                return events
            if event["type"] in ("error", "notice"):
                return events


def test_a_socket_without_a_token_is_closed_when_auth_is_required(client, monkeypatch):
    async def reject(_token):
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Sign in to use the debate service.")

    monkeypatch.setattr(routes, "require_token", reject)
    with pytest.raises(WebSocketDisconnect) as closed:
        with _connect(client) as socket:
            socket.receive_json()
    assert closed.value.code == 4401


def test_a_foreign_origin_is_refused_before_any_event(client):
    # The socket is accepted first so the refusal can carry a close code; it
    # must send nothing before closing.
    with pytest.raises(WebSocketDisconnect) as closed:
        with _connect(client, origin="https://not-the-app.example") as socket:
            socket.receive_json()
    assert closed.value.code == 4403


def test_the_loopback_origin_is_accepted(client):
    with _connect(client, origin="http://127.0.0.1:5173") as socket:
        ready = socket.receive_json()
    assert ready["type"] == "ready"
    assert ready["turn_end_ms"] >= 1000


def test_a_signed_in_token_is_verified_with_the_same_checker(client, monkeypatch):
    seen: list[str | None] = []

    async def token(value):
        seen.append(value)
        return "user-1"

    monkeypatch.setattr(routes, "require_token", token)
    _prepare(monkeypatch)
    with _connect(client, token="abc") as socket:
        socket.receive_json()
    assert seen == ["abc"]


def test_a_new_start_clears_an_unconfirmed_hands_free_turn(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        _start(socket)
        socket.send_json(
            {
                "type": "utterance_start",
                "speech_end_ms": 1_700_000_000_000,
                "mode": "hands_free",
            }
        )
        socket.send_bytes(WAV)
        while True:
            event = socket.receive_json()
            if event["type"] == "transcript" and event.get("pending"):
                break
        # A reconnect starts a new room; the old editable turn must not survive it.
        socket.send_json(
            {
                "type": "start",
                "topic": "This house would fund night buses",
                "learner_position": "for",
                "persona": "skeptic",
                "difficulty": "challenge",
                "reset": True,
            }
        )
        assert socket.receive_json()["type"] == "started"
        socket.send_json({"type": "confirm"})
        event = socket.receive_json()
    assert event["type"] == "error"
    assert "no turn to confirm" in event["message"].lower()


def test_the_socket_refuses_a_turn_before_the_debate_starts(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        socket.receive_json()
        socket.send_bytes(WAV)
        event = socket.receive_json()
    assert event["type"] == "error"
    assert "Start the debate" in event["message"]


def test_one_spoken_turn_returns_captions_in_order_with_their_audio(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        _start(socket)
        frames = []
        socket.send_json({"type": "utterance_start", "speech_end_ms": 1_700_000_000_000})
        socket.send_bytes(WAV)
        while True:
            frame = socket.receive()
            frames.append(frame)
            if frame.get("text"):
                event = json.loads(frame["text"])
                if event["type"] == "state" and event["state"] == "listening":
                    break

    kinds = []
    for frame in frames:
        if frame.get("text"):
            kinds.append(json.loads(frame["text"])["type"])
        elif frame.get("bytes"):
            kinds.append("audio")

    audio_at = kinds.index("audio")
    assert kinds[audio_at - 1] == "caption", "a caption always precedes its audio frame"
    assert kinds.count("caption") == kinds.count("audio")
    captions = [
        json.loads(frame["text"])
        for frame in frames
        if frame.get("text") and json.loads(frame["text"])["type"] == "caption"
    ]
    # One pre-rendered opener, then one clip per spoken sentence.
    assert sum(1 for caption in captions if caption.get("opener")) <= 1
    assert len([caption for caption in captions if not caption.get("opener")]) == 3
    assert kinds[-1] == "state"


def test_the_recognition_gate_drops_silence_without_calling_the_model(client, monkeypatch):
    _prepare(monkeypatch)
    monkeypatch.setattr(
        routes,
        "transcribe_utterance",
        _fake_transcription("Thank you for watching."),
    )
    calls: list[dict] = []

    async def spy(state):
        calls.append(state)
        yield ("final_delta", REPLY)
        yield ("diagnostics", "{}")

    monkeypatch.setattr(routes, "run_turn", _wrap_run_turn(monkeypatch, spy))
    with _connect(client) as socket:
        _start(socket)
        events = _speak(socket)

    assert events[0]["type"] == "notice"
    assert events[0]["reason"] == "silence_hallucination"
    assert "I didn't catch that" in events[0]["message"]
    assert calls == []


def test_a_too_short_utterance_is_dropped_without_an_opponent_reply(client, monkeypatch):
    _prepare(monkeypatch, text="so")
    with _connect(client) as socket:
        _start(socket)
        events = _speak(socket)
    assert events[0]["type"] == "notice"
    assert events[0]["reason"] == "too_short"


def test_the_learner_transcript_and_delivery_chips_arrive_before_the_reply(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        _start(socket)
        events = _speak(socket)

    kinds = [event["type"] for event in events]
    assert kinds.index("transcript") < kinds.index("delivery") < kinds.index("reply")
    learner = next(event for event in events if event["type"] == "transcript")
    assert learner["speaker"] == "learner"
    assert learner["content"].endswith("?")
    delivery = next(event for event in events if event["type"] == "delivery")
    assert set(delivery["signals"]) >= {"wpm", "fillers", "pauses"}


def test_a_typed_turn_works_without_a_microphone(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        _start(socket)
        socket.send_json({"type": "text", "text": "Parking is a subsidy for drivers."})
        events = _drain(socket)
    assert any(event["type"] == "reply" for event in events)
    assert any(event["type"] == "caption" for event in events)


def test_a_typed_turn_reaches_the_opponent_history_exactly_once(client, monkeypatch):
    _prepare(monkeypatch)
    states: list[dict] = []

    async def spy(state):
        states.append(state)
        yield ("final_delta", REPLY)
        yield ("diagnostics", "{}")

    monkeypatch.setattr(routes, "run_turn", _wrap_run_turn(monkeypatch, spy))
    with _connect(client) as socket:
        _start(socket)
        socket.send_json({"type": "text", "text": "Parking is a subsidy for drivers."})
        _drain(socket)

    learner_turns = [
        turn["content"] for turn in states[0]["history"] if turn["speaker"] == "learner"
    ]
    assert learner_turns == ["Parking is a subsidy for drivers."]


def test_a_spoken_turn_is_recorded_before_the_reply_is_built(client, monkeypatch):
    _prepare(monkeypatch)
    states: list[dict] = []

    async def spy(state):
        states.append(state)
        yield ("final_delta", REPLY)
        yield ("diagnostics", "{}")

    monkeypatch.setattr(routes, "run_turn", _wrap_run_turn(monkeypatch, spy))
    with _connect(client) as socket:
        _start(socket)
        _speak(socket)

    learner_turns = [
        turn["content"] for turn in states[0]["history"] if turn["speaker"] == "learner"
    ]
    assert learner_turns == ["Parking is a subsidy for drivers, so who pays?"]


def test_the_model_rate_limit_applies_per_turn(client, monkeypatch):
    _prepare(monkeypatch)
    limiter = SlidingWindowLimiter(1)
    monkeypatch.setattr(routes, "model_limiter", limiter)
    with _connect(client) as socket:
        _start(socket)
        first = _speak(socket)
        second = _speak(socket)

    assert any(event["type"] == "reply" for event in first)
    errors = [event for event in second if event["type"] == "error"]
    assert errors, second
    assert "Too many turns" in errors[0]["message"]
    assert errors[0]["retry_after"] >= 1
    assert not any(event["type"] == "reply" for event in second)


def test_an_interrupt_stores_only_the_words_that_were_played(client, monkeypatch):
    """Barge-in: the reply is cut, and the transcript records what was heard."""
    # A real synthesiser takes hundreds of milliseconds per sentence, which is
    # the window a learner actually interrupts in.
    _prepare(monkeypatch, delay=0.2)
    events: list[dict] = []
    with _connect(client) as socket:
        _start(socket)
        socket.send_json({"type": "utterance_start", "speech_end_ms": 1_700_000_000_000})
        socket.send_bytes(WAV)
        captions = 0
        while True:
            frame = socket.receive()
            if frame.get("bytes"):
                captions += 1
                if captions == 1:
                    # One caption finished, so the learner heard the first sentence.
                    socket.send_json({"type": "interrupt", "played": 1})
                continue
            event = json.loads(frame["text"])
            events.append(event)
            if event["type"] == "state" and event["state"] in ("interrupted", "listening"):
                break

    transcript = next(event for event in events if event["type"] == "transcript"
                      and event["speaker"] == "opponent")
    assert transcript["interrupted"] is True
    assert transcript["content"].endswith("[interrupted]")
    assert "year three" not in transcript["content"]
    assert events[-1]["state"] == "interrupted"


def test_a_second_utterance_while_the_opponent_speaks_is_refused_not_queued(client, monkeypatch):
    _prepare(monkeypatch, delay=0.2)
    events: list[dict] = []
    with _connect(client) as socket:
        _start(socket)
        socket.send_json({"type": "utterance_start", "speech_end_ms": 1_700_000_000_000})
        socket.send_bytes(WAV)
        socket.send_bytes(WAV)
        events.extend(_drain(socket))

    # The second clip is refused while a turn is running; it is not queued as a new turn.
    assert any(event["type"] == "notice" for event in events)
    assert sum(1 for event in events if event["type"] == "reply") == 1


def test_a_malformed_event_is_reported_without_closing_the_socket(client, monkeypatch):
    _prepare(monkeypatch)
    with _connect(client) as socket:
        socket.receive_json()
        socket.send_text("{not json")
        event = socket.receive_json()
        socket.send_json({"type": "ping"})
        pong = socket.receive_json()
    assert event["type"] == "error"
    assert pong["type"] == "pong"


def test_require_token_still_rejects_an_empty_token(monkeypatch):
    import app.auth as auth

    monkeypatch.setattr(auth, "REQUIRE_AUTH", True)
    with pytest.raises(HTTPException) as raised:
        import asyncio

        asyncio.run(require_token(None))
    assert raised.value.status_code == 401
