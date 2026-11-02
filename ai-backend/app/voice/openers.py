"""Pre-rendered "hold on" clips that cover the model's thinking time.

The opponent drafts and verifies a whole reply before anything is sent, so the
first sentence of an answer is seconds away. A short clip in the persona's voice
fills that gap: it carries no argument, answers nothing, and is rendered once at
startup so it costs nothing per turn.

Rules enforced by tests: no question marks (it must not look like a debate
question), at most six words, and the same line never plays twice in a row.
"""

import asyncio
import logging

from .tts import AudioClip, SpeechEngine

logger = logging.getLogger(__name__)

OPENER_LINES: dict[str, tuple[str, ...]] = {
    "strategist": ("Hm. Hold on.", "Let me think about that.", "Give me a moment."),
    "skeptic": ("Interesting. But hold on.", "Hm. Wait a moment.", "Hold on a second."),
    "diplomat": ("Let me consider that.", "One moment, if I may.", "I take your point."),
    "moderator": ("The floor is yours.",),
}


class OpenerCache:
    """Rendered opener clips, per persona, chosen round-robin without repeats."""

    def __init__(self, engine: SpeechEngine) -> None:
        self._engine = engine
        self._clips: dict[str, list[AudioClip]] = {}
        self._next: dict[str, int] = {}
        self._warmed = False
        self._lock = asyncio.Lock()

    async def warm(self) -> None:
        """Render every line once. Called at startup; failures leave the cache empty."""
        async with self._lock:
            if self._warmed or not self._engine.available:
                self._warmed = True
                return
            rendered: dict[str, list[AudioClip]] = {}
            for persona, lines in OPENER_LINES.items():
                clips = []
                for line in lines:
                    clip = await self._engine.synthesise(line, persona)
                    if clip is not None:
                        clips.append(clip)
                if clips:
                    rendered[persona] = clips
            self._clips = rendered
            self._warmed = True
            total = sum(len(clips) for clips in rendered.values())
            if total:
                logger.info("Pre-rendered %d opener clips for voice mode.", total)
            else:
                logger.info("No opener clips were rendered; voice turns start with the reply.")

    async def take(self, persona: str) -> AudioClip | None:
        clips = self._clips.get(persona) or []
        if not clips:
            return None
        index = self._next.get(persona, 0) % len(clips)
        # A single-line persona would repeat itself every turn; prefer silence.
        if len(clips) == 1 and self._next.get(persona, 0) > 0:
            return None
        self._next[persona] = self._next.get(persona, 0) + 1
        return clips[index]

    def reset(self) -> None:
        self._clips = {}
        self._next = {}
        self._warmed = False
