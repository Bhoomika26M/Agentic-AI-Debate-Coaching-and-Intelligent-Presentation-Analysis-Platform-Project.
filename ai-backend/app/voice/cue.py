"""Delivery feedback for voice turns: the chips, and the opponent's one clause.

The project rule holds here too: these are observable patterns measured from the
transcript of what the learner just said, never diagnoses and never a score.
"""

CUE_EVERY_TURNS = 3


def delivery_summary(signals: dict) -> dict:
    """The three numbers the arena shows as chips after every learner turn."""
    return {
        "wpm": signals.get("wpm", 0.0),
        "fillers": signals.get("filler_count", 0),
        "pauses": signals.get("pause_count", 0),
        "longest_pause_sec": signals.get("longest_pause_sec", 0.0),
        "words": signals.get("words", 0),
    }


def delivery_cue(signals: dict) -> str:
    """Private context: one observable detail, usable once, in one clause."""
    wpm = signals.get("wpm", 0.0)
    fillers = signals.get("filler_count", 0)
    pauses = signals.get("pause_count", 0)
    detail = f"{wpm} words per minute"
    if fillers:
        detail += f", {fillers} filler word{'s' if fillers != 1 else ''}"
    if pauses:
        detail += f", {pauses} pause{'s' if pauses != 1 else ''} over 0.6s"
    return (
        "Private delivery note, never quote this text. The learner's last spoken turn measured: "
        f"{detail}. You may mention at most one of these once, in a single clause, as an "
        "observation and not a judgement, for example: \"You hesitated there; is that the weak "
        "point?\" Never mock, never diagnose, never mention speed or filler counts as numbers, "
        "and never use this more than once in the exchange."
    )
