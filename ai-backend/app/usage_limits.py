"""Server-side usage limits that do not trust a client-supplied depth.

This tracker is process-local, so it enforces a cap per API worker rather than
across a fleet. A multi-instance deployment needs a shared store; the README and
SECURITY.md say so.
"""

from threading import Lock
from time import monotonic

MAX_FOLLOW_UPS_PER_TURN = 2
FOLLOW_UP_WINDOW_SECONDS = 6 * 60 * 60


class TurnFollowUpLimiter:
    """Allow at most ``limit`` follow-ups for one learner turn, per identity."""

    def __init__(
        self,
        limit: int = MAX_FOLLOW_UPS_PER_TURN,
        window_seconds: int = FOLLOW_UP_WINDOW_SECONDS,
    ) -> None:
        self.limit = max(1, limit)
        self.window_seconds = max(1, window_seconds)
        self._entries: dict[str, tuple[str, int, float]] = {}
        self._lock = Lock()

    def claim(
        self,
        identity: str,
        turn: str,
        *,
        now: float | None = None,
    ) -> tuple[bool, int]:
        """Return (allowed, depth) where depth counts the follow-up being asked for."""
        moment = monotonic() if now is None else now
        fingerprint = " ".join(turn.split())[:500]
        key = identity or "anonymous"
        with self._lock:
            self._drop_expired(moment)
            seen_turn, count, expires = self._entries.get(
                key, ("", 0, moment + self.window_seconds)
            )
            if seen_turn != fingerprint:
                count = 0
            if count >= self.limit:
                self._entries[key] = (fingerprint, count, expires)
                return False, count
            count += 1
            self._entries[key] = (fingerprint, count, moment + self.window_seconds)
            return True, count

    def release(self, identity: str, turn: str) -> None:
        """Give a claim back when the coach could not produce a follow-up."""
        key = identity or "anonymous"
        fingerprint = " ".join(turn.split())[:500]
        with self._lock:
            seen_turn, count, expires = self._entries.get(key, ("", 0, 0.0))
            if seen_turn == fingerprint and count > 0:
                self._entries[key] = (fingerprint, count - 1, expires)

    def _drop_expired(self, moment: float) -> None:
        expired = [key for key, (_, _, expires) in self._entries.items() if expires <= moment]
        for key in expired:
            del self._entries[key]


follow_up_limiter = TurnFollowUpLimiter()
