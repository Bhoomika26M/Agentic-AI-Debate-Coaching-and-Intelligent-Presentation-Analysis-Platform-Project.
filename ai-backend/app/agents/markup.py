"""Strips the `<<learner turn>>` wrapper from opponent output before a learner sees it."""

import re

# The wrapper prompts.py puts around learner turns, allowing loose spacing.
_MARKER = re.compile(r"<<\s*/?\s*learner[\s_-]*turn\b[^<>]*>>", re.IGNORECASE)
_VISIBLE_START = re.compile(r"<<\s*/?\s*learner\b", re.IGNORECASE)
# A tail that could still become a marker once the next chunk arrives.
_PARTIAL_MARKER = re.compile(
    r"^<{1,2}(?:\s*/\s*)?l?e?a?r?n?e?r?(?:\s*t(?:u(?:r(?:n(?:\b[^<>]*>?>?)?)?)?)?)?\Z",
    re.IGNORECASE,
)
_DOUBLE_SPACE = re.compile(r"[ \t]{2,}")
_MAX_HOLD = 160  # a longer fragment is not the wrapper we wrote


def strip_markers(text: str) -> str:
    """Remove every wrapper from finished text."""
    if "<<" not in text:
        return text
    return _DOUBLE_SPACE.sub(" ", _MARKER.sub("", text)).strip()


def leaks_marker(text: str) -> bool:
    """True when text still shows a wrapper opening, closed or not."""
    return bool(_VISIBLE_START.search(text))


class MarkerStream:
    """A stateful filter for one streamed reply."""

    def __init__(self) -> None:
        self._pending = ""  # may still turn into a marker on the next chunk
        self._started = False

    def feed(self, chunk: str) -> str:
        self._pending = _MARKER.sub("", self._pending + chunk)
        cut = self._hold_from()
        ready = _DOUBLE_SPACE.sub(" ", self._pending[:cut])
        self._pending = self._pending[cut:]
        return self._emit(ready)

    def flush(self) -> str:
        ready, self._pending = self._pending, ""
        return self._emit(_DOUBLE_SPACE.sub(" ", ready))

    def _emit(self, text: str) -> str:
        if not self._started:  # a stripped leading wrapper leaves its whitespace behind
            text = text.lstrip()
            self._started = bool(text)
        return text

    def _hold_from(self) -> int:
        index = self._pending.rfind("<")
        if index < 0:
            return len(self._pending)
        # A marker starts at the first '<' in a run, not the last one.
        start = index
        while start > 0 and self._pending[start - 1] == "<":
            start -= 1
        tail = self._pending[start:]
        if len(tail) <= _MAX_HOLD and _PARTIAL_MARKER.match(tail):
            return start
        return len(self._pending)
