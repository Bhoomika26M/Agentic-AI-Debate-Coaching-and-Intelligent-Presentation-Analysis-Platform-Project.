"""The opponent prompt must carry the learner's own answers, and nothing invented."""

from app.prompts import build_messages, preference_lines, preference_text
from app.schemas import DebateRequest, PracticePreferences


def _request(**overrides) -> DebateRequest:
    payload = {
        "topic": "Should cities ban cars from their centres?",
        "learner_position": "for",
        "persona": "skeptic",
        "difficulty": "challenge",
    }
    payload.update(overrides)
    return DebateRequest(**payload)


def _system(**overrides) -> str:
    return build_messages(_request(**overrides))[0]["content"]


def test_the_opponent_prompt_carries_the_learners_aim():
    system = _system(
        preferences=PracticePreferences(
            goal="evidence", purpose="competition", focus=["delivery"]
        )
    )
    assert "grounding every claim" in system
    assert "tournament standards of proof" in system
    assert "steadier delivery" in system


def test_the_aim_is_marked_as_direction_the_opponent_must_not_repeat():
    system = _system(preferences=PracticePreferences(goal="nerves"))
    assert "never quote, mention, or score it" in system


def test_an_answer_free_session_leaves_the_prompt_as_it_was():
    plain = _system()
    assert "asked to work on" not in plain
    assert plain == _system(preferences=None)


def test_a_partial_answer_set_adds_only_the_lines_it_has():
    assert len(preference_lines(PracticePreferences(purpose="school"))) == 1
    assert preference_lines(PracticePreferences()) == []


def test_an_unusable_preference_mapping_is_ignored_rather_than_raised():
    assert preference_text({"goal": "not-a-goal"}) == ""
    assert preference_text(None) == ""
    assert "evidence" in preference_text({"goal": "evidence"})
