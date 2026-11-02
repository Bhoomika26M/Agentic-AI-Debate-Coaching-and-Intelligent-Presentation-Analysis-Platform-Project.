"""One live voice debate: configuration, history, and speaking-turn counters.

The session owns the transcript that the debate graph reads, so a spoken turn is
indistinguishable from a typed one by the time it reaches the guard.
"""

from dataclasses import dataclass, field
from typing import Literal

MAX_SESSION_TURNS = 200
# The delivery cue is available on every third learner turn, at most.
DELIVERY_CUE_EVERY = 3

Position = Literal["for", "against"]


@dataclass
class VoiceSession:
    topic: str = ""
    learner_position: Position = "for"
    persona: str = "skeptic"
    difficulty: str = "challenge"
    preferences: dict | None = None
    adaptive_tactics: bool = True
    reply_length: str = "voice"
    memory: list[dict] = field(default_factory=list)
    history: list[dict] = field(default_factory=list)
    learner_turns: int = 0
    last_cue_turn: int = 0
    dropped_utterances: int = 0
    interrupted_turns: int = 0

    @property
    def ready(self) -> bool:
        return len(self.topic.strip()) >= 3

    def delivery_cue_allowed(self) -> bool:
        """True on the third, sixth, ninth… learner turn, never twice in a row."""
        return (
            self.learner_turns > 0
            and self.learner_turns - self.last_cue_turn >= DELIVERY_CUE_EVERY
        )

    def mark_cue_used(self) -> None:
        self.last_cue_turn = self.learner_turns

    def begin_learner_turn(self) -> int:
        """Count the turn before it is answered, so the cue cadence is exact."""
        self.learner_turns += 1
        return self.learner_turns

    def record_learner(self, text: str) -> None:
        self._append("learner", text)

    def record_opponent(self, text: str) -> None:
        self._append("opponent", text)

    def _append(self, speaker: str, text: str) -> None:
        content = " ".join((text or "").split())
        if not content:
            return
        self.history.append({"speaker": speaker, "content": content[:4000]})
        if len(self.history) > MAX_SESSION_TURNS:
            del self.history[: len(self.history) - MAX_SESSION_TURNS]

    def debate_state(self, latest: str | None, *, delivery_cue: str | None = None) -> dict:
        """The exact state a typed turn would build, plus the voice-only extras."""
        return {
            "topic": self.topic,
            "learner_position": self.learner_position,
            "persona": self.persona,
            "difficulty": self.difficulty,
            "history": list(self.history),
            "latest": latest,
            "memory": list(self.memory),
            "preferences": self.preferences,
            "adaptive_tactics": self.adaptive_tactics,
            "reply_length": self.reply_length,
            "voice": True,
            "delivery_cue": delivery_cue,
        }

    def configure(self, payload: dict) -> None:
        """Apply a start/reset event. Unknown fields are ignored, not trusted."""
        topic = str(payload.get("topic") or "").strip()
        if topic:
            self.topic = topic[:240]
        position = payload.get("learner_position")
        if position in ("for", "against"):
            self.learner_position = position
        persona = payload.get("persona")
        if persona in ("strategist", "skeptic", "diplomat"):
            self.persona = persona
        difficulty = payload.get("difficulty")
        if difficulty in ("warm-up", "challenge", "cross-examination"):
            self.difficulty = difficulty
        preferences = payload.get("preferences")
        self.preferences = preferences if isinstance(preferences, dict) else None
        if isinstance(payload.get("adaptive_tactics"), bool):
            self.adaptive_tactics = bool(payload["adaptive_tactics"])
        if isinstance(payload.get("memory"), list):
            self.memory = [item for item in payload["memory"] if isinstance(item, dict)][:12]
        if payload.get("reset"):
            self.history = []
            self.learner_turns = 0
            self.last_cue_turn = 0
            self.dropped_utterances = 0
            self.interrupted_turns = 0
