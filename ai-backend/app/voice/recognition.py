"""The gate between speech recognition and the debate graph.

Whisper on a short, quiet clip invents text: a cough becomes "Thank you.", a
click becomes "you". Those strings must never reach the guard or the model,
because an invented turn looks like a real one and the learner hears an answer
to something they did not say. The checks here are deliberately blunt and run
before anything else in the voice path.
"""

import re
from dataclasses import dataclass

from ..delivery import FILLER_RE

# A turn needs at least two words to be an argument worth answering.
MIN_UTTERANCE_WORDS = 2
# Shorter than this is a click, a cough, or a chair. The browser VAD also drops
# these, but a client can send anything and the server is the authority.
MIN_UTTERANCE_SEC = 0.4
# Whisper's own confidence that the window contained speech at all.
MAX_NO_SPEECH_PROB = 0.6
# Average log-probability of the chosen tokens; below this the decode is noise.
MIN_AVG_LOGPROB = -1.0

# Text Whisper produces from silence, music, or a keyboard. Matched after
# normalisation, so punctuation and fillers do not hide a hallucination.
SILENCE_HALLUCINATIONS = frozenset(
    {
        "thanks for watching",
        "thank you for watching",
        "thanks for watching and see you next time",
        "thank you",
        "thanks",
        "you",
        "ok",
        "okay",
        "bye",
        "bye bye",
        "goodbye",
        "please subscribe",
        "subscribe to my channel",
        "subtitles by the amara org community",
        "transcription by",
        "i'm going to go to the bathroom",
    }
)

_REPEAT_WORD = re.compile(r"\b(\w+)(?:\s+\1\b)+", re.IGNORECASE)
_REPEAT_PHRASE = re.compile(r"\b(\w+(?:\s+\w+){1,2})(?:\s+\1\b)+", re.IGNORECASE)
_TERMINAL = re.compile(r"[.!?]\s*$")
_SPACE = re.compile(r"\s+")


@dataclass(frozen=True)
class RecognitionVerdict:
    """Whether an utterance may be treated as a learner turn, and why not."""

    accepted: bool
    text: str
    reason: str | None = None
    words: int = 0

    @property
    def notice(self) -> str:
        """What the learner hears when a turn is dropped. Never blames them."""
        return "I didn't catch that. Say it again."


def normalise_transcript(text: str | None) -> str:
    """Collapse the stutters recognition adds, and give the turn an end mark.

    The learner's wording is preserved: only immediate repeats ("I I I think",
    "the the") are collapsed, because a run-on sentence with no punctuation is
    what speech looks like, not an error to fix.
    """
    cleaned = _SPACE.sub(" ", (text or "").strip())
    if not cleaned:
        return ""
    cleaned = _REPEAT_WORD.sub(r"\1", cleaned)
    cleaned = _REPEAT_PHRASE.sub(r"\1", cleaned)
    cleaned = _SPACE.sub(" ", cleaned).strip()
    if cleaned and not _TERMINAL.search(cleaned):
        # The guard's soft patterns are anchored to sentence boundaries, so a
        # spoken turn needs the end mark a typist would have supplied.
        cleaned = f"{cleaned}."
    return cleaned


def matching_text(text: str | None) -> str:
    """The same turn with disfluencies removed, for matching only.

    "Um, thanks for watching" is still a hallucination. The learner's own copy
    of the transcript keeps the fillers.
    """
    stripped = FILLER_RE.sub(" ", (text or "").lower())
    stripped = re.sub(r"[^\w\s']", " ", stripped)
    return _SPACE.sub(" ", stripped).strip()


def _word_count(text: str) -> int:
    return len([word for word in re.findall(r"[A-Za-z0-9']+", text) if word])


def check_utterance(
    text: str | None,
    *,
    no_speech_prob: float | None = None,
    avg_logprob: float | None = None,
    duration_sec: float | None = None,
) -> RecognitionVerdict:
    """Decide whether a decoded utterance becomes a learner turn.

    Order matters: a hallucination is reported as such even when it happens to
    be long enough and confident enough to pass the other checks.
    """
    normalised = normalise_transcript(text)
    words = _word_count(normalised)
    matched = matching_text(normalised)

    if not matched or matched in SILENCE_HALLUCINATIONS:
        return RecognitionVerdict(False, normalised, "silence_hallucination", words)
    if duration_sec is not None and duration_sec < MIN_UTTERANCE_SEC:
        return RecognitionVerdict(False, normalised, "too_short", words)
    if words < MIN_UTTERANCE_WORDS:
        return RecognitionVerdict(False, normalised, "too_short", words)
    if no_speech_prob is not None and no_speech_prob > MAX_NO_SPEECH_PROB:
        return RecognitionVerdict(False, normalised, "no_speech", words)
    if avg_logprob is not None and avg_logprob < MIN_AVG_LOGPROB:
        return RecognitionVerdict(False, normalised, "low_confidence", words)
    return RecognitionVerdict(True, normalised, None, words)
