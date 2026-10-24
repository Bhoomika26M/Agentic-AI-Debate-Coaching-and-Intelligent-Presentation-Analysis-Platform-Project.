"""In-process request limits.

These are per API worker, not distributed. A multi-instance deployment needs a
shared store in front of the API; the README and SECURITY.md say so.
"""

import os
from collections import deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import Depends, HTTPException, Request

from .auth import authenticate_request

RATE_LIMIT_PER_MINUTE = max(1, int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")))
MODEL_RATE_LIMIT_PER_MINUTE = max(1, int(os.getenv("MODEL_RATE_LIMIT_PER_MINUTE", "12")))


class SlidingWindowLimiter:
    """Allow at most `limit` events per key inside a rolling window."""

    def __init__(self, limit: int, window_seconds: int = 60) -> None:
        self.limit = max(1, limit)
        self.window_seconds = max(1, window_seconds)
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def allow(self, key: str, *, now: float | None = None) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        moment = monotonic() if now is None else now
        with self._lock:
            events = self._events.setdefault(key or "unknown", deque())
            cutoff = moment - self.window_seconds
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self.limit:
                retry_after = max(1, ceil(events[0] + self.window_seconds - moment))
                return False, retry_after
            events.append(moment)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


request_limiter = SlidingWindowLimiter(RATE_LIMIT_PER_MINUTE)
model_limiter = SlidingWindowLimiter(MODEL_RATE_LIMIT_PER_MINUTE)


def client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_model_rate_limit(
    request: Request,
    subject: str | None = Depends(authenticate_request),
) -> None:
    """Per signed-in learner (or guest IP) budget for model-backed endpoints."""
    allowed, retry_after = model_limiter.allow(subject or client_key(request))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many model requests. Wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )
