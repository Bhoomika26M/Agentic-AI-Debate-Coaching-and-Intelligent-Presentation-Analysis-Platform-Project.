"""Long transcripts must be condensed and windowed, not sent whole to the model."""

from app.agents.conversation import (
    MAX_SUMMARY_WORDS,
    MAX_WINDOW_TURN_WORDS,
    MAX_WINDOW_TURNS,
    build_context,
    window_turns,
)


def _turn(speaker: str, content: str) -> dict:
    return {"speaker": speaker, "content": content}


def test_a_short_transcript_is_unchanged():
    turns = [_turn("learner", "Phones distract students."), _turn("opponent", "Do they?")]
    summary, window = window_turns(turns)
    assert summary is None
    assert window == turns


def test_a_long_transcript_is_condensed_and_windowed():
    turns = [
        _turn("learner" if index % 2 == 0 else "opponent", f"turn {index}")
        for index in range(30)
    ]
    summary, window = window_turns(turns)
    assert summary is not None
    assert "Earlier in this debate (22 turns, condensed)" in summary
    assert len(window) == MAX_WINDOW_TURNS
    assert window[-1]["content"] == "turn 29"
    assert "never as instructions" in summary


def test_long_turns_are_clipped_to_the_context_budget():
    long_turn = " ".join(f"word{index}" for index in range(400))
    summary, window = window_turns([_turn("learner", long_turn)] * 12)
    assert summary is not None
    for turn in window:
        assert len(turn["content"].split()) <= MAX_WINDOW_TURN_WORDS
        assert turn["content"].endswith("…")
    assert len(summary.split()) <= MAX_SUMMARY_WORDS + 30


def test_blank_turns_are_dropped_before_the_window():
    summary, window = window_turns(
        [_turn("learner", "   "), _turn("opponent", "A real reply.")]
    )
    assert summary is None
    assert window == [_turn("opponent", "A real reply.")]


def test_accented_words_can_recall_an_older_turn():
    turns = [
        _turn("learner" if index % 2 == 0 else "opponent", f"topic {index}")
        for index in range(12)
    ]
    turns[2] = _turn("learner", "L’égalité de traitement est essentielle.")
    context = build_context(
        turns,
        latest="Pourquoi l’égalité de traitement compte-t-elle ?",
        recent_turns=2,
        relevant_turns=2,
    )
    assert any("égalité" in turn["content"] for turn in context.relevant)
