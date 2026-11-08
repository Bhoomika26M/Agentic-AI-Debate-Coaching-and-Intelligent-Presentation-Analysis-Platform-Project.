import pytest
from pydantic import ValidationError

from app.schemas import (
    AnalysisRequest,
    ChallengeRequest,
    DebateRequest,
    JudgeRequest,
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


def test_a_continued_debate_can_send_more_than_twenty_history_turns():
    history = [
        {"speaker": "learner", "content": f"turn {index}"} for index in range(30)
    ]
    assert len(DebateRequest(**_debate(history=history)).history) == 30
    with pytest.raises(ValidationError):
        DebateRequest(**_debate(history=[{"speaker": "learner", "content": "x"}] * 201))


def test_a_history_turn_can_be_marked_as_a_challenge():
    request = DebateRequest(
        **_debate(
            history=[
                {
                    "speaker": "opponent",
                    "content": "How do you answer that?",
                    "kind": "challenge",
                }
            ]
        )
    )
    assert request.history[0].kind == "challenge"
    with pytest.raises(ValidationError):
        DebateRequest(
            **_debate(
                history=[
                    {"speaker": "opponent", "content": "How?", "kind": "invented"}
                ]
            )
        )


def test_an_overlong_review_gets_a_readable_limit_message():
    turns = [{"speaker": "learner", "content": "A point."} for _ in range(201)]
    with pytest.raises(ValidationError, match="too long to review in one pass"):
        AnalysisRequest(
            topic="Should schools ban phones?",
            learner_position="for",
            turns=turns,
        )


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


def test_model_backed_requests_accept_only_the_supported_local_models():
    assert DebateRequest(**_debate(model="gemma4:e4b")).model == "gemma4:e4b"
    assert AnalysisRequest(
        topic="Should schools ban phones?",
        learner_position="for",
        turns=[{"speaker": "learner", "content": "Attention improves."}],
        model="qwen3.5:4b",
    ).model == "qwen3.5:4b"
    assert ChallengeRequest(
        topic="Should schools ban phones?",
        latest="Attention improves.",
        depth=0,
        model="gemma4:e4b",
    ).model == "gemma4:e4b"
    assert PlanRequest(model="gemma4:e4b").model == "gemma4:e4b"
    # Omitting a model keeps the server default.
    assert DebateRequest(**_debate()).model is None
    with pytest.raises(ValidationError):
        DebateRequest(**_debate(model="llama3:8b"))
    with pytest.raises(ValidationError):
        PlanRequest(model="not-a-model")


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


def test_a_rubric_only_report_can_be_judged_before_the_other_branches_finish():
    request = JudgeRequest.model_validate(
        {
            "report": {
                "ratings": {
                    "clarity": {"score": 4, "note": "clear"},
                    "relevance": {"score": 3, "note": "mostly on point"},
                    "evidence_strength": {"score": 2, "note": "thin"},
                    "logical_consistency": {"score": 4, "note": "sound"},
                    "persuasiveness": {"score": 3, "note": "flat start"},
                }
            },
            "turns": [{"speaker": "learner", "content": "Make the case."}],
        }
    )
    assert request.report.counterarguments == []
    assert request.report.fallacies == []
