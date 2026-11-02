"""The gate between speech recognition and the debate graph."""

from pathlib import Path

import pytest

from app.voice.recognition import (
    MIN_UTTERANCE_SEC,
    SILENCE_HALLUCINATIONS,
    check_utterance,
    matching_text,
    normalise_transcript,
)

FIXTURE = Path(__file__).parent / "fixtures" / "silence_hallucinations.txt"


def _fixture_phrases() -> list[str]:
    lines = FIXTURE.read_text(encoding="utf-8").splitlines()
    return [line.strip() for line in lines if line.strip() and not line.startswith("#")]


@pytest.mark.parametrize("phrase", _fixture_phrases())
def test_every_fixture_hallucination_is_dropped(phrase):
    """The fixture is the contract: these strings must never reach the model."""
    verdict = check_utterance(phrase)
    assert verdict.accepted is False
    assert verdict.reason == "silence_hallucination"


def test_the_fixture_and_the_code_list_cannot_drift():
    assert set(_fixture_phrases()) == set(SILENCE_HALLUCINATIONS)


def test_a_hallucination_with_fillers_and_punctuation_is_still_dropped():
    verdict = check_utterance("Um, thanks for watching!")
    assert verdict.accepted is False
    assert verdict.reason == "silence_hallucination"


def test_one_word_is_not_a_turn():
    verdict = check_utterance("privacy")
    assert verdict.accepted is False
    assert verdict.reason == "too_short"


def test_a_clip_shorter_than_the_click_threshold_is_dropped():
    verdict = check_utterance("yes but", duration_sec=MIN_UTTERANCE_SEC / 2)
    assert verdict.accepted is False
    assert verdict.reason == "too_short"


def test_a_quiet_clip_is_dropped_on_the_decoders_own_score():
    verdict = check_utterance(
        "the motion is about housing", no_speech_prob=0.92
    )
    assert verdict.accepted is False
    assert verdict.reason == "no_speech"


def test_a_garbled_decode_is_dropped_on_log_probability():
    verdict = check_utterance("moving housing liver", avg_logprob=-1.8)
    assert verdict.accepted is False
    assert verdict.reason == "low_confidence"


def test_a_real_argument_is_accepted_with_its_wording_intact():
    verdict = check_utterance("The ban costs more than it saves, so who pays for it")
    assert verdict.accepted is True
    assert verdict.reason is None
    assert verdict.words >= 2


def test_a_run_on_transcript_gets_the_end_mark_the_guard_expects():
    assert normalise_transcript("so the ban costs money and nobody pays") == (
        "so the ban costs money and nobody pays."
    )


def test_stutters_are_collapsed_without_rewriting_the_sentence():
    assert normalise_transcript("I I I think the the levy is unfair") == (
        "I think the levy is unfair."
    )


def test_a_repeated_short_phrase_is_collapsed():
    assert normalise_transcript("I think I think the ban works") == (
        "I think the ban works."
    )


def test_fillers_are_kept_for_the_learner_and_stripped_only_for_matching():
    original = normalise_transcript("Um, the um levy is unfair")
    assert "Um" in original
    assert "um" not in matching_text(original)


def test_existing_punctuation_is_not_doubled():
    assert normalise_transcript("Is that fair?") == "Is that fair?"


def test_an_empty_decode_is_rejected_rather_than_treated_as_silence():
    assert check_utterance("").accepted is False
    assert check_utterance(None).accepted is False
