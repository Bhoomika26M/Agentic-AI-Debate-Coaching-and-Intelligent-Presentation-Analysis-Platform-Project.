"""The ``/ws/voice`` endpoint: auth, rate limits, the recognition gate, and speech.

One socket carries JSON events and binary audio frames in both directions, so
ordering and cancellation stay simple: a caption is always sent immediately
before the audio it describes, and an ``interrupt`` message cancels the turn
that is in flight.

The audio the learner sends is transcribed and then dropped. It is never
written to disk, never stored in the session, and never sent anywhere else.
"""

import asyncio
import json
import logging
import os
import time
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..auth import require_token
from ..delivery import analyze_delivery
from ..rate_limit import model_limiter, request_limiter
from ..speech import (
    AudioValidationError,
    TranscriptionTimeoutError,
    TranscriptionUnavailableError,
)
from .cue import delivery_cue, delivery_summary
from .openers import OpenerCache
from .pipeline import TurnControl, TurnHooks, run_turn
from .recognition import check_utterance
from .session import VoiceSession
from .stt import transcribe_utterance
from .tts import VOICES, AudioClip, SpeechEngine, build_engine

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UTTERANCE_BYTES = 8 * 1024 * 1024
BUSY_TURN = "The opponent is still answering. Wait for the question."
RECOGNITION_ERROR = "Speech recognition is unavailable. Type your turn instead."
TURN_ERROR = "That turn didn't come through. Try again."

_engine: SpeechEngine | None = None
_openers: OpenerCache | None = None


def speech() -> tuple[SpeechEngine, OpenerCache]:
    """One speech engine per process; the ONNX session is expensive to build."""
    global _engine, _openers
    if _engine is None:
        _engine = build_engine()
        _openers = OpenerCache(_engine)
    return _engine, _openers


def allowed_origins() -> list[str]:
    # Both loopback spellings by default: the Vite dev server is reached as
    # localhost and as 127.0.0.1, and the browser sends whichever was typed.
    raw = os.getenv(
        "WEB_ORIGIN", "http://127.0.0.1:5173,http://localhost:5173"
    )
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


class VoiceConnection:
    """One socket's state: session, speech engine, and the in-flight turn."""

    def __init__(self, websocket: WebSocket, subject: str | None) -> None:
        self.websocket = websocket
        self.subject = subject
        self.host = websocket.client.host if websocket.client else "unknown"
        self.identity = subject or self.host
        self.session = VoiceSession()
        self.engine, self.openers = speech()
        self._send_lock = asyncio.Lock()
        self._turn: asyncio.Task | None = None
        self._control: TurnControl | None = None
        self._utterance_meta: dict[str, Any] = {}
        self._pending: dict[str, Any] | None = None
        self._warmed = False

    @property
    def busy(self) -> bool:
        return self._turn is not None and not self._turn.done()

    async def send(self, event: dict[str, Any]) -> None:
        async with self._send_lock:
            await self.websocket.send_json(event)

    async def send_audio(self, clip: AudioClip, caption: dict[str, Any]) -> None:
        # Caption first, then its bytes, under one lock: the client always knows
        # what the next frame is before it decodes it.
        async with self._send_lock:
            await self.websocket.send_json(caption)
            await self.websocket.send_bytes(clip.data)

    async def run(self) -> None:
        await self.send(
            {
                "type": "ready",
                "tts": self.engine.label if self.engine.available else "none",
                "persona_voices": {
                    key: profile.description for key, profile in VOICES.items()
                },
                "recognition": "faster-whisper",
                "turn_end_ms": int(os.getenv("VOICE_TURN_END_MS", "1100")),
            }
        )
        if self.engine.available and not self._warmed:
            self._warmed = True
            # Pre-render the opener clips once, off the critical path.
            asyncio.create_task(self.openers.warm())
        while True:
            message = await self.websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            if message.get("text") is not None:
                if not await self._handle_json(message["text"]):
                    break
            elif message.get("bytes") is not None:
                await self._handle_audio(message["bytes"])
        await self._stop_turn()

    async def _handle_json(self, raw: str) -> bool:
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            await self.send({"type": "error", "message": "Malformed event.", "recoverable": True})
            return True
        if not isinstance(payload, dict):
            return True
        kind = payload.get("type")

        if kind == "start":
            self.session.configure(payload)
            await self.send(
                {
                    "type": "started",
                    "topic": self.session.topic,
                    "persona": self.session.persona,
                    "reply_length": self.session.reply_length,
                    "moderator": self.engine.available,
                }
            )
            # The For side opens. For a fresh Against session, let the
            # opponent make that opening before accepting the learner's turn.
            if self.session.learner_position == "against" and not self.session.history:
                self._turn = asyncio.create_task(self._answer(None))

        elif kind == "utterance_start":
            self._utterance_meta = payload
        elif kind == "text":
            text = str(payload.get("text") or "").strip()
            if not text:
                return True
            await self._begin_text_turn(text[:4000])
        elif kind == "confirm":
            await self._confirm(payload)
        elif kind == "dismiss":
            self._pending = None
            await self.send({"type": "notice", "message": "Turn discarded.", "reason": "dismissed"})
            await self.send({"type": "state", "state": "listening"})
        elif kind == "interrupt":
            played = payload.get("played")
            await self._interrupt(played if isinstance(played, int) else None)
        elif kind == "announce":
            # Explicit, so an announcement can never race the first turn.
            if self.engine.available and self.session.ready:
                line = (
                    "We’re picking up from the exchange so far."
                    if payload.get("continuing")
                    else "Round one. Opening statements."
                )
                asyncio.create_task(self._announce(line))
        elif kind == "stop":
            return False
        elif kind == "ping":
            await self.send({"type": "pong"})
        else:
            await self.send(
                {"type": "error", "message": f"Unknown event '{kind}'.", "recoverable": True}
            )
        return True

    async def _handle_audio(self, audio: bytes) -> None:
        if not self.session.ready:
            await self.send(
                {"type": "error", "message": "Start the debate first.", "recoverable": True}
            )
            return
        if self.busy:
            await self.send({"type": "notice", "message": BUSY_TURN, "reason": "busy"})
            return
        meta = self._utterance_meta
        self._utterance_meta = {}
        self._turn = asyncio.create_task(self._listen(audio, meta))

    async def _announce(self, text: str) -> None:
        """A moderator line in its own voice, outside the debate transcript."""
        clip = await self.engine.synthesise(text, "moderator")
        if clip is None or self.busy:
            return
        await self.send_audio(
            clip,
            {
                "type": "caption",
                "text": clip.text,
                "index": -1,
                "moderator": True,
                "duration_ms": clip.duration_ms,
                "sample_rate": clip.sample_rate,
            },
        )

    async def _confirm(self, payload: dict[str, Any]) -> None:
        """The learner accepted (or corrected) the recognised turn."""
        pending = self._pending
        self._pending = None
        if pending is None:
            await self.send(
                {"type": "error", "message": "There is no turn to confirm.", "recoverable": True}
            )
            return
        text = str(payload.get("text") or pending["text"]).strip()[:4000]
        if not text:
            await self.send({"type": "state", "state": "listening"})
            return
        await self.send(
            {"type": "transcript", "speaker": "learner", "content": text, "pending": False}
        )
        self.session.record_learner(text)
        await self._answer(
            text,
            speech_end_ms=pending.get("speech_end_ms"),
            received_at_ms=pending.get("received_at_ms"),
            delivery_cue=pending.get("cue"),
            stt_ms=pending.get("stt_ms", 0),
        )

    async def _begin_text_turn(self, text: str) -> None:
        if not self.session.ready:
            await self.send(
                {"type": "error", "message": "Start the debate first.", "recoverable": True}
            )
            return
        if self.busy:
            await self.send({"type": "notice", "message": BUSY_TURN, "reason": "busy"})
            return
        # Record before the graph runs: the opponent must read the same history
        # a typed turn would, and a failed turn still belongs to the transcript.
        self.session.record_learner(text)
        self._turn = asyncio.create_task(self._answer(text))

    async def _listen(self, audio: bytes, meta: dict[str, Any]) -> None:
        """Transcribe one utterance, gate it, and answer it if it survives."""
        if len(audio) > MAX_UTTERANCE_BYTES:
            await self.send(
                {"type": "error", "message": "That clip is too long. Keep turns under a minute.",
                 "recoverable": True}
            )
            return
        received_at_ms = int(time.time() * 1000)
        started = asyncio.get_running_loop().time()
        try:
            decoded = await transcribe_utterance(audio)
        except AudioValidationError as error:
            await self.send({"type": "error", "message": str(error), "recoverable": True})
            return
        except (TranscriptionTimeoutError, TranscriptionUnavailableError) as error:
            logger.info("Voice transcription unavailable: %s", error)
            await self.send(
                {"type": "error", "message": RECOGNITION_ERROR, "recoverable": True}
            )
            return
        stt_ms = int((asyncio.get_running_loop().time() - started) * 1000)

        verdict = check_utterance(
            decoded.get("text"),
            no_speech_prob=decoded.get("no_speech_prob"),
            avg_logprob=decoded.get("avg_logprob"),
            duration_sec=decoded.get("duration"),
        )
        if not verdict.accepted:
            # Nothing reaches the guard or the model: an invented turn is worse
            # than a prompt to try again.
            self.session.dropped_utterances += 1
            await self.send(
                {
                    "type": "notice",
                    "message": verdict.notice,
                    "reason": verdict.reason,
                    "stt": {"ms": stt_ms, "words": verdict.words},
                }
            )
            await self.send({"type": "state", "state": "listening"})
            return

        signals = analyze_delivery(decoded.get("words") or [])
        self.session.begin_learner_turn()
        cue = None
        if self.session.delivery_cue_allowed():
            cue = delivery_cue(signals)
            self.session.mark_cue_used()
        prepared = {
            "text": verdict.text,
            "cue": cue,
            "speech_end_ms": meta.get("speech_end_ms"),
            "received_at_ms": received_at_ms,
            "stt_ms": stt_ms,
        }
        if meta.get("mode") == "hands_free":
            # The learner sees the transcript for a moment and can fix it or
            # drop it. Recognition errors must not reach the guard or the model.
            self._pending = prepared
            await self.send({"type": "delivery", "signals": delivery_summary(signals)})
            await self.send(
                {
                    "type": "transcript",
                    "speaker": "learner",
                    "content": verdict.text,
                    "pending": True,
                    "edit_window_ms": int(os.getenv("VOICE_EDIT_WINDOW_MS", "1500")),
                    "stt": {"ms": stt_ms, "words": verdict.words},
                }
            )
            return
        await self.send(
            {
                "type": "transcript",
                "speaker": "learner",
                "content": verdict.text,
                "pending": False,
                "stt": {"ms": stt_ms, "words": verdict.words},
            }
        )
        await self.send({"type": "delivery", "signals": delivery_summary(signals)})
        self.session.record_learner(verdict.text)
        await self._answer(
            verdict.text,
            speech_end_ms=prepared["speech_end_ms"],
            received_at_ms=received_at_ms,
            delivery_cue=cue,
            stt_ms=stt_ms,
        )

    async def _answer(
        self,
        latest: str | None,
        *,
        speech_end_ms: int | None = None,
        received_at_ms: int | None = None,
        delivery_cue: str | None = None,
        stt_ms: int = 0,
    ) -> None:
        """Run one turn through the shared guard/planner/verifier and speak it."""
        allowed, retry_after = model_limiter.allow(self.identity)
        if not allowed:
            await self.send(
                {
                    "type": "error",
                    "message": "Too many turns. Wait a moment and try again.",
                    "retry_after": retry_after,
                    "recoverable": True,
                }
            )
            return
        # Imported here: main imports this router, so a module-level import cycles.
        from ..main import stream_slots

        if stream_slots.locked():
            await self.send(
                {
                    "type": "error",
                    "message": "The local opponent is busy. Try again in a moment.",
                    "retry_after": 5,
                    "recoverable": True,
                }
            )
            return
        await stream_slots.acquire()
        control = TurnControl()
        self._control = control
        try:
            await run_turn(
                self.session,
                latest,
                hooks=TurnHooks(emit=self.send, audio=self.send_audio),
                engine=self.engine,
                openers=self.openers,
                control=control,
                speech_end_ms=speech_end_ms,
                received_at_ms=received_at_ms,
                delivery_cue=delivery_cue,
                stt_ms=stt_ms,
            )
        except (TranscriptionUnavailableError, TranscriptionTimeoutError) as error:
            logger.info("Voice turn could not be transcribed: %s", error)
            await self.send({"type": "error", "message": RECOGNITION_ERROR, "recoverable": True})
        except Exception:  # noqa: BLE001 - a broken turn must not close the socket
            logger.exception("Voice turn failed")
            await self.send({"type": "error", "message": TURN_ERROR, "recoverable": True})
        finally:
            self._control = None
            stream_slots.release()
            # Only now may the learner speak again: the slot really is free.
            try:
                await self.send({"type": "state", "state": "listening"})
            except RuntimeError:
                pass

    async def _interrupt(self, played: int | None) -> None:
        """Barge-in: stop the reply, and remember what was actually heard."""
        if self._control is not None:
            self._control.cancel(played)
        if self._turn is not None and not self._turn.done():
            # The pipeline releases on its own; give it a moment to emit its
            # interrupted transcript before the next turn may start.
            try:
                await asyncio.wait_for(asyncio.shield(self._turn), timeout=2.0)
            except (TimeoutError, asyncio.CancelledError):
                pass

    async def _stop_turn(self) -> None:
        if self._control is not None:
            self._control.cancel()
        if self._turn is not None and not self._turn.done():
            self._turn.cancel()
            try:
                await self._turn
            except (asyncio.CancelledError, Exception):
                pass


@router.websocket("/ws/voice")
async def voice_socket(websocket: WebSocket) -> None:
    # Accept before refusing. A close() on an unaccepted socket is answered with
    # HTTP 403 during the handshake, so the browser sees only 1006 and the
    # documented 4401/4403/4429 codes never arrive. Nothing is read from the
    # socket until the origin and token checks have passed.
    await websocket.accept()
    host = websocket.client.host if websocket.client else "unknown"
    allowed, retry_after = request_limiter.allow(host)
    if not allowed:
        await websocket.close(code=4429, reason=f"Too many requests. Retry in {retry_after}s.")
        return
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    if origin and origin not in allowed_origins():
        await websocket.close(code=4403, reason="Origin not allowed.")
        return
    try:
        subject = await require_token(websocket.query_params.get("token"))
    except HTTPException as error:
        # Keep invalid credentials distinct from a temporary verification
        # outage so the browser can offer the right recovery action.
        close_code = 4401 if error.status_code == 401 else 4503
        await websocket.close(code=close_code, reason=str(error.detail))
        return
    connection: VoiceConnection | None = None
    try:
        connection = VoiceConnection(websocket, subject)
        await connection.run()
    except WebSocketDisconnect:
        logger.info("Voice socket closed by the client.")
    except Exception:  # noqa: BLE001 - log, never leak internals to the browser
        logger.exception("Voice socket failed")
        try:
            await websocket.close(
                code=1011,
                reason="The voice service failed while opening the room.",
            )
        except RuntimeError:
            pass
    finally:
        if connection is not None:
            await connection._stop_turn()
        try:
            await websocket.close()
        except (RuntimeError, WebSocketDisconnect):
            # The browser may already have closed the socket. A failed final
            # close is cleanup, not a second application error.
            pass
