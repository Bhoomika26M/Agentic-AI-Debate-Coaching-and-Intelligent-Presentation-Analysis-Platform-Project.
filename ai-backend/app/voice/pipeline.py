"""One spoken turn: the shared debate graph, then sentence-by-sentence speech.

The graph call is identical to a typed turn (`respond_stream`), so the guard,
planner, draft, verifier and reviser all run unchanged. What differs is the
transport and the output: the reply is split into sentences, each synthesised
and sent as its own binary frame, so the first sentence can start playing while
the rest render.

The event order is pinned by tests in `tests/test_voice_pipeline.py`.
"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any

from ..agents.debate import respond_stream
from .openers import OpenerCache
from .session import VoiceSession
from .timings import TurnTimings
from .tts import AudioClip, SpeechEngine, split_sentences

logger = logging.getLogger(__name__)

INTERRUPTED_MARK = "[interrupted]"

Emit = Callable[[dict[str, Any]], Awaitable[None]]
SendAudio = Callable[[AudioClip, dict[str, Any]], Awaitable[None]]
Respond = Callable[[dict], AsyncIterator[tuple[str, str]]]


@dataclass
class TurnHooks:
    """Where a turn's output goes. A test substitutes recording callables."""

    emit: Emit
    audio: SendAudio


@dataclass
class TurnControl:
    """Cancellation for one turn, plus how much the learner actually heard."""

    played: int | None = None
    _event: asyncio.Event = field(default_factory=asyncio.Event)

    def cancel(self, played: int | None = None) -> None:
        if played is not None and played >= 0:
            self.played = int(played)
        self._event.set()

    @property
    def cancelled(self) -> bool:
        return self._event.is_set()


@dataclass
class TurnResult:
    reply: str
    spoken: str
    interrupted: bool
    sentences: list[str]
    diagnostics: dict
    timings: dict
    audio_sentences: int = 0


class _Cancelled(Exception):
    """Internal signal: the turn was interrupted before a reply existed."""


def _public_diagnostics(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


async def run_turn(
    session: VoiceSession,
    latest: str | None,
    *,
    hooks: TurnHooks,
    engine: SpeechEngine,
    openers: OpenerCache | None = None,
    control: TurnControl | None = None,
    speech_end_ms: int | None = None,
    received_at_ms: int | None = None,
    delivery_cue: str | None = None,
    stt_ms: int = 0,
    respond: Respond | None = None,
) -> TurnResult:
    """Answer one learner turn out loud, from opener to diagnostics."""
    responder = respond or respond_stream
    control = control or TurnControl()
    started = time.perf_counter()
    timings = TurnTimings(sentences=0, stt_ms=stt_ms)
    timings.tts_engine = engine.label if engine.available else "none"
    if speech_end_ms and received_at_ms:
        # Transport only: from the end of speech to the server holding the clip.
        # Recognition happens after this, and is reported as its own number.
        timings.endpoint_wait_ms = max(0, int(received_at_ms) - int(speech_end_ms))

    await hooks.emit({"type": "state", "state": "thinking"})

    state = session.debate_state(latest, delivery_cue=delivery_cue)
    graph = asyncio.create_task(_collect(responder(state)))

    # The opener plays while the graph works; it carries no argument content.
    if openers is not None and engine.available and not control.cancelled:
        clip = await openers.take(session.persona)
        if clip is not None:
            timings.opener_used = True
            await hooks.emit({"type": "state", "state": "speaking"})
            await _send_caption(hooks, clip, {"opener": True, "index": -1})
            if timings.first_audio_ms == 0:
                timings.first_audio_ms = _elapsed(started)
                timings.voice_to_voice_ms = _wall_elapsed(speech_end_ms, timings.first_audio_ms)

    try:
        reply, raw_diagnostics = await _await_graph(graph, control)
    except _Cancelled:
        timings.total_ms = _elapsed(started)
        timings.interrupted = True
        await hooks.emit(
            {"type": "transcript", "speaker": "opponent", "content": "", "interrupted": True}
        )
        await hooks.emit({"type": "state", "state": "interrupted"})
        await hooks.emit({"type": "diagnostics", "turn": {"voice": timings.as_dict()}})
        return TurnResult("", "", True, [], {}, timings.as_dict())

    diagnostics = _public_diagnostics(raw_diagnostics)
    timings.plan_ms = int(diagnostics.get("plan_ms") or 0)
    timings.draft_ms = int(diagnostics.get("draft_ms") or 0)
    timings.verify_ms = int(diagnostics.get("review_ms") or 0)

    sentences = split_sentences(reply)
    timings.sentences = len(sentences)
    await hooks.emit(
        {
            "type": "reply",
            "text": reply,
            "verified": bool(diagnostics.get("verified")),
            "redirect_reason": diagnostics.get("redirect_reason"),
            "guard_pattern": diagnostics.get("guard_pattern"),
        }
    )
    if sentences:
        await hooks.emit({"type": "state", "state": "speaking"})

    spoken: list[str] = []
    audio_sentences = 0
    for index, sentence in enumerate(sentences):
        if control.cancelled:
            break
        clip = await engine.synthesise(sentence, session.persona)
        if clip is None:
            # No speech engine this turn: the browser speaks, or the text stands alone.
            timings.tts_engine = "none"
            break
        if control.cancelled:
            break
        await _send_caption(hooks, clip, {"index": index, "total": len(sentences)})
        spoken.append(sentence)
        audio_sentences += 1
        timings.audio_ms += clip.duration_ms
        if timings.first_audio_ms == 0:
            timings.first_audio_ms = _elapsed(started)
            timings.voice_to_voice_ms = _wall_elapsed(speech_end_ms, timings.first_audio_ms)
            timings.tts_first_ms = timings.first_audio_ms - timings.draft_ms - timings.verify_ms
        if timings.reply_first_audio_ms == 0:
            timings.reply_first_audio_ms = _wall_elapsed(speech_end_ms, _elapsed(started))

    timings.total_ms = _elapsed(started)

    if control.cancelled:
        heard = _heard(sentences, spoken, control)
        content = f"{heard} {INTERRUPTED_MARK}".strip()
        timings.interrupted = True
        await hooks.emit(
            {
                "type": "transcript",
                "speaker": "opponent",
                "content": content,
                "interrupted": True,
            }
        )
        await hooks.emit({"type": "state", "state": "interrupted"})
        await hooks.emit(
            {
                "type": "diagnostics",
                "turn": {**diagnostics, "voice": timings.as_dict()},
            }
        )
        session.record_opponent(content)
        session.interrupted_turns += 1
        return TurnResult(
            reply=reply,
            spoken=content,
            interrupted=True,
            sentences=sentences,
            diagnostics=diagnostics,
            timings=timings.as_dict(),
            audio_sentences=audio_sentences,
        )

    # A finished turn stores its whole text: every sentence was either heard or
    # shown. Only an interrupted turn is trimmed to the words actually spoken.
    await hooks.emit(
        {"type": "transcript", "speaker": "opponent", "content": reply, "interrupted": False}
    )
    session.record_opponent(reply)
    # The socket, not the turn, announces "listening": only it knows the turn
    # slot has been released and a new utterance will actually be accepted.
    await hooks.emit(
        {"type": "diagnostics", "turn": {**diagnostics, "voice": timings.as_dict()}}
    )
    return TurnResult(
        reply=reply,
        spoken=reply,
        interrupted=False,
        sentences=sentences,
        diagnostics=diagnostics,
        timings=timings.as_dict(),
        audio_sentences=audio_sentences,
    )


async def _send_caption(hooks: TurnHooks, clip: AudioClip, meta: dict) -> None:
    event = {
        "type": "caption",
        "text": clip.text,
        "duration_ms": clip.duration_ms,
        "sample_rate": clip.sample_rate,
        **meta,
    }
    await hooks.audio(clip, event)


def _heard(sentences: list[str], spoken: list[str], control: TurnControl) -> str:
    """Only what reached the learner's ears, by their own playback report."""
    if control.played is not None:
        return " ".join(sentences[: control.played + 1]).strip()
    return " ".join(spoken).strip()


def _elapsed(started: float) -> int:
    return int(round((time.perf_counter() - started) * 1000))


def _wall_elapsed(speech_end_ms: int | None, fallback_ms: int) -> int:
    if not speech_end_ms:
        return fallback_ms
    return max(0, int(time.time() * 1000) - int(speech_end_ms))


async def _collect(responder: AsyncIterator[tuple[str, str]]) -> tuple[str, str | None]:
    parts: list[str] = []
    diagnostics: str | None = None
    async for kind, text in responder:
        if kind == "final_delta":
            parts.append(text)
        elif kind == "diagnostics":
            diagnostics = text
    return "".join(parts).strip(), diagnostics


async def _await_graph(task: asyncio.Task, control: TurnControl) -> tuple[str, str | None]:
    """Wait for the graph, but stop waiting the moment the learner interrupts."""
    while not task.done():
        if control.cancelled:
            task.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await task
            raise _Cancelled
        await asyncio.wait({task}, timeout=0.05)
    return task.result()
