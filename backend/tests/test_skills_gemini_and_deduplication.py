from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.debate import DebateArgument, DebateSession
from app.services.llm_service import LLMAnalysisError, LLMService

client = TestClient(app)


def auth_user(role="learner"):
    email = f"user-{uuid4().hex[:8]}@example.com"
    registered = client.post(
        "/auth/register",
        json={"name": f"Test {role.title()}", "email": email, "password": "Password123!", "role": role},
    )
    assert registered.status_code == 201
    logged_in = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert logged_in.status_code == 200
    token = logged_in.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    user_info = client.get("/auth/me", headers=headers).json()
    return headers, user_info


def test_ai_status_diagnostic_reports_gemini():
    response = client.get("/system/ai-status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] in {"gemini", "disabled"}
    assert "model" in data
    assert "is_configured" in data
    assert "status" in data


def test_gemini_request_formatting_and_error_handling(monkeypatch):
    service = LLMService()
    service.provider = "gemini"
    service.api_key = "test-gemini-key"
    service.model = "gemini-3.8-flash"
    monkeypatch.setattr(service, "is_available", lambda: True)

    # 1. Success response
    fake_gemini_resp = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "Rebuttal response from Gemini."}]
                }
            }
        ]
    }
    request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent")
    monkeypatch.setattr(
        "app.services.llm_service.httpx.post",
        lambda *args, **kwargs: httpx.Response(200, json=fake_gemini_resp, request=request),
    )

    result = service._request_gemini("system prompt", "user argument")
    assert result == "Rebuttal response from Gemini."

    # 2. 401 Unauthorized handling
    monkeypatch.setattr(
        "app.services.llm_service.httpx.post",
        lambda *args, **kwargs: httpx.Response(401, text="API_KEY_INVALID", request=request),
    )
    with pytest.raises(LLMAnalysisError) as exc_info:
        service._request_gemini("system prompt", "user argument")
    assert exc_info.value.status_code == 401
    assert "Invalid or unauthorized Gemini API key" in str(exc_info.value)


def test_skills_auto_calculation_and_sync():
    headers, user = auth_user("learner")

    # Fetch initial skills - should have has_activity = False
    res = client.get("/skills/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["communication_score"] == 0
    assert data["argumentation_score"] == 0
    assert data["has_activity"] is False

    # Simulate user debate activity directly in DB
    db = SessionLocal()
    try:
        debate = DebateSession(
            topic="Renewable Energy Subsidies",
            format="one_on_one",
            created_by=user["id"],
            status="active",
        )
        db.add(debate)
        db.commit()
        db.refresh(debate)

        # Add 2 user arguments
        arg1 = DebateArgument(
            debate_id=debate.id,
            user_id=user["id"],
            turn_order=1,
            position="for",
            content="Subsidies accelerate technology adoption and lower long-term costs.",
        )
        arg2 = DebateArgument(
            debate_id=debate.id,
            user_id=user["id"],
            turn_order=2,
            position="for",
            content="Furthermore, empirical data from solar installations shows an 80% price reduction over a decade.",
        )
        db.add_all([arg1, arg2])
        db.commit()
    finally:
        db.close()

    # Trigger skill sync
    sync_res = client.post("/skills/sync", headers=headers)
    assert sync_res.status_code == 200
    updated_data = sync_res.json()
    assert updated_data["has_activity"] is True
    assert updated_data["argumentation_score"] > 0
    assert updated_data["communication_score"] > 0
    assert updated_data["provenance"]["arguments_count"] == 2


def test_debate_duplicate_prevention_on_rapid_submission():
    headers, user = auth_user("learner")

    payload = {
        "topic": "Universal Healthcare Access",
        "description": "Debate on public healthcare.",
        "format": "parliamentary",
        "position": "for",
        "ai_opponent": False,
    }

    # First creation
    res1 = client.post("/debates", json=payload, headers=headers)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Second immediate creation with same topic/format
    res2 = client.post("/debates", json=payload, headers=headers)
    assert res2.status_code == 201
    id2 = res2.json()["id"]

    # Should reuse existing session and not create a duplicate row
    assert id1 == id2


def test_my_debates_filtering_and_deletion():
    h1, u1 = auth_user("learner")
    h2, u2 = auth_user("learner")

    # U1 creates debate A
    res_a = client.post("/debates", json={"topic": f"Topic-{uuid4().hex[:6]}", "format": "policy"}, headers=h1)
    assert res_a.status_code == 201
    deb_a_id = res_a.json()["id"]

    # U2 lists "my_debates=true" -> should NOT see Topic A
    res_u2_my = client.get("/debates?my_debates=true", headers=h2)
    assert all(d["id"] != deb_a_id for d in res_u2_my.json())

    # U2 attempts to delete Topic A -> 403 Forbidden
    del_res = client.delete(f"/debates/{deb_a_id}", headers=h2)
    assert del_res.status_code == 403

    # U1 deletes Topic A -> 204 No Content
    del_ok = client.delete(f"/debates/{deb_a_id}", headers=h1)
    assert del_ok.status_code == 204
