from fastapi.testclient import TestClient
import httpx
import pytest

from app.main import app


client = TestClient(app)


def register_and_login(email: str) -> str:
    register_response = client.post(
        "/auth/register",
        json={"name": "Debate Tester", "email": email, "password": "strongpassword123", "role": "learner"},
    )
    assert register_response.status_code in {201, 400, 409}
    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "strongpassword123"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def create_debate(token: str, *, ai_opponent: bool = False, position: str = "neutral") -> int:
    response = client.post(
        "/debates",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "topic": "Should cities expand bike lanes?",
            "description": "Consider safety and mobility trade-offs.",
            "format": "policy",
            "ai_opponent": ai_opponent,
            "position": position,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_valid_argument_analysis_input_requires_auth():
    response = client.post(
        "/analysis/arguments",
        json={
            "topic": "Should schools require remote learning?",
            "argument_text": "Remote learning reduces commuting and gives students flexibility, but it can restrict social interaction and may lower engagement for some learners.",
            "position": "against",
        },
    )
    assert response.status_code == 401


def test_authenticated_analysis_creation_and_validation():
    token = register_and_login("analysis@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/analysis/arguments",
        headers=headers,
        json={
            "topic": "Should schools require remote learning?",
            "argument_text": "Remote learning reduces commuting and gives students flexibility, but it can restrict social interaction and may lower engagement for some learners.",
            "position": "against",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["topic"] == "Should schools require remote learning?"
    assert payload["overall_score"] >= 0
    assert len(payload["scores"]) == 5

    invalid = client.post(
        "/analysis/arguments",
        headers=headers,
        json={"topic": "", "argument_text": "   ", "position": "neutral"},
    )
    assert invalid.status_code == 422


def test_fallacy_detector_accepts_clear_argument_without_forced_label():
    from app.services.argument_analysis_service import detect_fallacies

    result = detect_fallacies(
        "The policy increases taxes, and the local budget office reports a 12% rise in transit funding while ridership remains stable."
    )
    assert isinstance(result, list)


def test_create_debate_with_ai_opponent_assigns_opposite_side():
    token = register_and_login("ai_create@example.com")
    response = client.post(
        "/debates",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "topic": "Should cities expand bike lanes?",
            "description": "A policy debate about urban mobility.",
            "format": "policy",
            "ai_opponent": True,
            "position": "for",
        },
    )
    assert response.status_code == 201
    participants = response.json()["participants"]
    assert any(item["is_ai"] and item["position"] == "against" for item in participants)
    assert any(item["user_id"] and not item["is_ai"] and item["position"] == "for" for item in participants)


def test_debate_argument_submission_and_message_access_control():
    creator_token = register_and_login("debate_creator@example.com")
    debate_id = create_debate(creator_token)

    participant_token = register_and_login("debate_participant@example.com")
    participant_headers = {"Authorization": f"Bearer {participant_token}"}
    joined = client.post(f"/debates/{debate_id}/join?position=for", headers=participant_headers)
    assert joined.status_code == 201

    argument = client.post(
        f"/debates/{debate_id}/arguments",
        headers=participant_headers,
        json={
            "content": "Bike lanes reduce congestion by encouraging shorter trips and safer commuting, which reduces road stress for everyone.",
            "position": "for",
        },
    )
    assert argument.status_code == 201
    assert argument.json()["turn_order"] == 1
    assert argument.json()["role"] == "user"

    analyses = client.get("/analysis/arguments", headers=participant_headers)
    assert analyses.status_code == 200
    assert len(analyses.json()) >= 1

    outsider_token = register_and_login("debate_outsider@example.com")
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}
    denied_post = client.post(
        f"/debates/{debate_id}/arguments",
        headers=outsider_headers,
        json={"content": "This is a sufficiently detailed argument for the bike lane debate.", "position": "against"},
    )
    assert denied_post.status_code == 403
    denied_history = client.get(f"/debates/{debate_id}/arguments", headers=outsider_headers)
    assert denied_history.status_code == 403


def test_ai_debate_persists_contextual_turns_in_order_and_deduplicates(monkeypatch):
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: True)
    received_context = []

    def generate_reply(topic, debate_rules, user_position, user_argument, debate_history, ai_position):
        received_context.append(list(debate_history))
        return f"Opponent response addressing: {user_argument[:35]}"

    monkeypatch.setattr("app.routers.debates.llm_service.generate_debate_response", generate_reply)
    token = register_and_login("ai_turns@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    debate_id = create_debate(token, ai_opponent=True, position="for")

    first_payload = {
        "content": "Bike lanes reduce congestion by encouraging safer and shorter urban trips.",
        "position": "for",
        "idempotency_key": "turn-one",
    }
    first = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=first_payload)
    assert first.status_code == 201
    second_payload = {
        "content": "Protected routes also make cycling safer for families and local businesses.",
        "position": "for",
        "idempotency_key": "turn-two",
    }
    second = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=second_payload)
    assert second.status_code == 201
    assert second.json()["turn_order"] == 3
    assert "opponent (against): Opponent response" in "\n".join(received_context[1])

    history = client.get(f"/debates/{debate_id}/arguments", headers=headers)
    assert history.status_code == 200
    assert [item["turn_order"] for item in history.json()] == [1, 2, 3, 4]
    assert [item["role"] for item in history.json()] == ["user", "opponent", "user", "opponent"]
    repeated = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=second_payload)
    assert repeated.status_code == 201
    assert repeated.json()["id"] == second.json()["id"]
    assert len(received_context) == 2
    assert len(client.get(f"/debates/{debate_id}/arguments", headers=headers).json()) == 4


def test_ai_provider_missing_preserves_user_turn_and_allows_retry(monkeypatch):
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: False)
    token = register_and_login("opponent_retry@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    debate_id = create_debate(token, ai_opponent=True, position="for")
    payload = {
        "content": "Free transit could improve access, but the city should explain how it will fund added service.",
        "position": "for",
        "idempotency_key": "stable-turn-key",
    }
    unavailable = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=payload)
    assert unavailable.status_code == 503
    assert "argument was saved" in unavailable.json()["detail"]
    saved = client.get(f"/debates/{debate_id}/arguments", headers=headers)
    assert [item["turn_order"] for item in saved.json()] == [1]

    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: True)
    monkeypatch.setattr(
        "app.routers.debates.llm_service.generate_debate_response",
        lambda **kwargs: "The funding question is central; what recurring revenue would cover added service?",
    )
    retried = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=payload)
    assert retried.status_code == 201
    assert retried.json()["id"] == saved.json()[0]["id"]
    history = client.get(f"/debates/{debate_id}/arguments", headers=headers)
    assert [item["turn_order"] for item in history.json()] == [1, 2]
    assert history.json()[1]["role"] == "opponent"


def test_provider_timeout_preserves_user_argument_and_returns_gateway_timeout(monkeypatch):
    from app.services.llm_service import LLMAnalysisError

    token = register_and_login("opponent_timeout@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    debate_id = create_debate(token, ai_opponent=True, position="against")
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: True)

    def timeout_response(**kwargs):
        raise LLMAnalysisError("The AI provider timed out.", 504)

    monkeypatch.setattr("app.routers.debates.llm_service.generate_debate_response", timeout_response)
    response = client.post(
        f"/debates/{debate_id}/arguments",
        headers=headers,
        json={
            "content": "A city should compare current transit reliability with projected construction costs.",
            "position": "against",
            "idempotency_key": "timeout-turn",
        },
    )
    assert response.status_code == 504
    assert "argument was saved" in response.json()["detail"]
    assert len(client.get(f"/debates/{debate_id}/arguments", headers=headers).json()) == 1


def test_provider_rate_limit_is_reported_without_leaking_credentials(monkeypatch):
    from app.services.llm_service import LLMAnalysisError, LLMService

    service = LLMService()
    service.api_key = "test-only-provider-secret"
    monkeypatch.setattr(service, "is_available", lambda: True)
    request = httpx.Request("POST", "https://provider.invalid/chat/completions")
    monkeypatch.setattr(
        "app.services.llm_service.httpx.post",
        lambda *args, **kwargs: httpx.Response(429, request=request),
    )

    with pytest.raises(LLMAnalysisError) as error:
        service._request_chat_completion("system", "user")
    assert error.value.status_code == 429
    assert "rate limited" in str(error.value)
    assert "test-only-provider-secret" not in str(error.value)


def test_coach_feedback_requires_ai_provider_configuration(monkeypatch):
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: False)
    token = register_and_login("coach_disabled@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    debate_id = create_debate(token)
    argument = client.post(
        f"/debates/{debate_id}/arguments",
        headers=headers,
        json={
            "content": "School uniforms reduce distractions and simplify morning routines, though the policy should consider affordability.",
            "position": "for",
        },
    )
    assert argument.status_code == 201
    response = client.post(f"/debates/{debate_id}/coach-feedback", headers=headers)
    assert response.status_code == 503
    assert "AI coaching is unavailable" in response.json()["detail"]


def test_coach_feedback_weighting_persistence_and_idempotent_retrieval(monkeypatch):
    token = register_and_login("coach_persist@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    debate_id = create_debate(token, ai_opponent=True, position="for")
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: True)
    monkeypatch.setattr(
        "app.routers.debates.llm_service.generate_debate_response",
        lambda **kwargs: "The opposing view asks whether flexibility alone improves retention.",
    )
    for content in (
        "Remote work reduces commuting costs and increases flexibility for employees and employers.",
        "Retention should be compared with team coordination and measurable workplace outcomes.",
    ):
        response = client.post(
            f"/debates/{debate_id}/arguments",
            headers=headers,
            json={"content": content, "position": "for"},
        )
        assert response.status_code == 201

    coach_calls = []

    def coaching_response(**kwargs):
        coach_calls.append(kwargs)
        return {
            "category_scores": {
                "argument_quality": {"score": 80, "explanation": "Clear position and reasons."},
                "evidence_usage": {"score": 70, "explanation": "Examples need more specific support."},
                "logical_consistency": {"score": 90, "explanation": "The reasons support the conclusion."},
                "rebuttal_effectiveness": {"score": 60, "explanation": "The counterpoint needs a direct response."},
                "communication_clarity": {"score": 100, "explanation": "The messages are concise."},
            },
            "overall_assessment": "The case is clear, with room for more specific evidence.",
            "strengths": ["Clear central position", "Practical supporting reasons"],
            "weaknesses": ["Needs sourced examples"],
            "improvement_suggestions": ["Add an attributable example and connect it to retention."],
            "improvement_plan": {
                "strongest_skills": ["Clear claims"],
                "areas_for_improvement": ["Evidence specificity"],
                "practice_recommendations": ["Support each claim with a sourced example."],
                "next_steps": ["Prepare one source-backed example for the next round."],
                "measurable_next_debate_goal": "Use one specific source and explain its relevance.",
                "progress_indicators": ["Compare evidence quality across later saved reports."],
            },
        }

    monkeypatch.setattr("app.routers.debates.llm_service.generate_coaching_feedback", coaching_response)
    response = client.post(f"/debates/{debate_id}/coach-feedback", headers=headers)
    assert response.status_code == 200
    report = response.json()
    assert report["overall_score"] == 80.0
    assert report["source_argument_count"] == 2
    assert report["improvement_plan"]["progress_indicators"] == []
    assert report["overall_assessment"].startswith("There is not enough debate history")
    assert len(coach_calls) == 1

    retry = client.post(f"/debates/{debate_id}/coach-feedback", headers=headers)
    assert retry.status_code == 200
    assert retry.json()["id"] == report["id"]
    assert len(coach_calls) == 1
    persisted = client.get(f"/debates/{debate_id}/coach-feedback", headers=headers)
    assert persisted.status_code == 200
    assert len(persisted.json()) == 1
    assert persisted.json()[0]["improvement_plan"]["measurable_next_debate_goal"]
    outsider = register_and_login("coach_history_outsider@example.com")
    denied_feedback = client.get(
        f"/debates/{debate_id}/coach-feedback",
        headers={"Authorization": f"Bearer {outsider}"},
    )
    assert denied_feedback.status_code == 403

    next_argument = client.post(
        f"/debates/{debate_id}/arguments",
        headers=headers,
        json={"content": "The organization can compare retention and coordination results before choosing a policy.", "position": "for"},
    )
    assert next_argument.status_code == 201
    next_report = client.post(f"/debates/{debate_id}/coach-feedback", headers=headers)
    assert next_report.status_code == 200
    assert next_report.json()["source_argument_count"] == 3
    assert len(next_report.json()["improvement_plan"]["progress_indicators"]) == 5
    assert len(coach_calls) == 2
