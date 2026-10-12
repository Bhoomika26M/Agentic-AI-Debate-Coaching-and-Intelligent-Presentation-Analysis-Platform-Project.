import pytest
from pydantic import ValidationError

from app.schemas import (
    AnalysisRequest,
    DebateRequest,
    PlanRequest,
    SessionDigest,
)


def _debate(**overrides) -> dict:
    payload = {
        "topic": "Should schools ban phones?",
        "learner_position": "for",
        "persona": "skeptic",
        "difficulty": "challenge",
    }
    payload.update(overrides)
    return payload


def test_analysis_needs_at_least_one_learner_argument():
    with pytest.raises(ValidationError):
        AnalysisRequest(
            topic="Should schools ban phones?",
            learner_position="for",
            turns=[{"speaker": "opponent", "content": "Make your case."}],
        )
    request = AnalysisRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        turns=[{"speaker": "learner", "content": "Attention improves."}],
    )
    assert request.turns[0].speaker == "learner"


def test_a_turn_cannot_be_enormous_and_blank_means_opening():
    with pytest.raises(ValidationError):
        DebateRequest(**_debate(learner_argument="x" * 4001))
    # A blank turn is a request for the opening statement, so it is accepted and normalised later.
    assert DebateRequest(**_debate(learner_argument="  ")).learner_argument == "  "


def test_memory_digests_are_bounded_and_typed():
    payload = _debate(
        memory=[
            {"ratings": None, "fallacy_labels": ["Straw Man"], "filler_rate_per_100w": 2.5},
        ]
    )
    request = DebateRequest.model_validate(payload)
    assert request.memory[0].fallacy_labels == ["Straw Man"]
    with pytest.raises(ValidationError):
        SessionDigest.model_validate({"fallacy_labels": ["Made Up Fallacy"]})
    with pytest.raises(ValidationError):
        SessionDigest.model_validate({"filler_rate_per_100w": -1})
    with pytest.raises(ValidationError):
        DebateRequest.model_validate(_debate(memory=[{} for _ in range(13)]))


def test_a_digest_can_speak_for_a_rehearsal_or_a_delivery_take():
    only_delivery = SessionDigest.model_validate({"ratings": None, "filler_rate_per_100w": 4.2})
    assert only_delivery.ratings is None
    full = SessionDigest.model_validate(
        {
            "ratings": {
                "clarity": {"score": 4, "note": "clear"},
                "relevance": {"score": 3, "note": "ok"},
                "evidence_strength": {"score": 2, "note": "thin"},
                "logical_consistency": {"score": 4, "note": "sound"},
                "persuasiveness": {"score": 3, "note": "flat"},
            }
        }
    )
    assert full.ratings is not None and full.ratings.evidence_strength.score == 2


def test_a_plan_request_accepts_an_empty_archive_but_not_a_bad_experience_level():
    assert PlanRequest().digests == []
    with pytest.raises(ValidationError):
        PlanRequest(experience="expert")


def test_scores_stay_inside_the_rubric():
    with pytest.raises(ValidationError):
        SessionDigest.model_validate(
            {
                "ratings": {
                    "clarity": {"score": 6, "note": "too high"},
                    "relevance": {"score": 3, "note": "ok"},
                    "evidence_strength": {"score": 2, "note": "thin"},
                    "logical_consistency": {"score": 4, "note": "sound"},
                    "persuasiveness": {"score": 3, "note": "flat"},
                }
            }
        )
