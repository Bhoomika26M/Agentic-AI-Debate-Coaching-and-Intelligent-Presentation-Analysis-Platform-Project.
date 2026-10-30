from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import app


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


def test_debate_creation_and_turn_ordering(monkeypatch):
    headers, user = auth_user("learner")

    # Mock AI response
    monkeypatch.setattr(
        "app.routers.debates.llm_service.is_available",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.routers.debates._generate_ai_reply",
        lambda database, debate, human_argument: f"Counterargument to {human_argument.content[:20]} from AI opponent.",
    )

    # 1. Create debate
    created = client.post(
        "/debates",
        headers=headers,
        json={
            "topic": "Should universal basic income be implemented?",
            "format": "oxford",
            "position": "for",
            "ai_opponent": True,
            "description": "Standard Oxford debate rules.",
        },
    )
    assert created.status_code == 201
    debate = created.json()
    assert debate["topic"] == "Should universal basic income be implemented?"
    assert debate["ai_opponent"] is True

    # 2. Submit first human argument
    arg1 = client.post(
        f"/debates/{debate['id']}/arguments",
        headers=headers,
        json={
            "content": "Universal basic income reduces poverty and stimulates local consumer spending by providing an unconditional financial safety net.",
            "position": "for",
            "idempotency_key": "turn-test-1",
        },
    )
    assert arg1.status_code == 201
    assert arg1.json()["turn_order"] == 1

    # Verify conversation history has human turn 1 and AI turn 2
    args_list = client.get(f"/debates/{debate['id']}/arguments", headers=headers).json()
    assert len(args_list) == 2
    assert args_list[0]["turn_order"] == 1
    assert args_list[0]["is_ai"] is False
    assert args_list[1]["turn_order"] == 2
    assert args_list[1]["is_ai"] is True


def test_coaching_scoring_exact_weights(monkeypatch):
    headers, user = auth_user("learner")

    # Create debate & participant
    created = client.post(
        "/debates",
        headers=headers,
        json={"topic": "Are renewable subsidies necessary?", "format": "one_on_one", "position": "for", "ai_opponent": False},
    )
    debate = created.json()

    # Submit an argument
    client.post(
        f"/debates/{debate['id']}/arguments",
        headers=headers,
        json={"content": "Renewable subsidies stimulate initial technological innovation and lower battery storage production costs.", "position": "for"},
    )

    # Mock coach feedback with precise category scores
    # Weights: argument_quality: 0.30, evidence_usage: 0.20, logical_consistency: 0.20, rebuttal_effectiveness: 0.15, communication_clarity: 0.15
    # Expected overall: 80*0.30 + 70*0.20 + 90*0.20 + 60*0.15 + 85*0.15
    # = 24 + 14 + 18 + 9 + 12.75 = 77.75
    monkeypatch.setattr(
        "app.routers.debates.llm_service.is_available",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.routers.debates.llm_service.provider",
        "mock_openai",
    )
    monkeypatch.setattr(
        "app.routers.debates.llm_service.model",
        "gpt-4o-mini",
    )
    monkeypatch.setattr(
        "app.routers.debates.llm_service.generate_coaching_feedback",
        lambda topic, user_position, debate_history, previous_feedback: {
            "overall_assessment": "Solid argumentative structure with clear causal reasoning.",
            "category_scores": {
                "argument_quality": {"score": 80, "explanation": "Well-defined central claim."},
                "evidence_usage": {"score": 70, "explanation": "References manufacturing costs."},
                "logical_consistency": {"score": 90, "explanation": "No logical contradictions."},
                "rebuttal_effectiveness": {"score": 60, "explanation": "Opening turn lacks direct opponent rebuttal."},
                "communication_clarity": {"score": 85, "explanation": "Concise and persuasive."},
            },
            "strengths": ["Clear economic premise"],
            "weaknesses": ["Needs specific benchmark citations"],
            "improvement_suggestions": ["Include empirical percentage drops in battery costs"],
            "improvement_plan": {
                "strongest_skills": ["Clarity"],
                "areas_for_improvement": ["Evidence"],
                "practice_recommendations": ["Review IRENA renewable reports"],
                "next_steps": ["Incorporate empirical statistics"],
                "measurable_next_debate_goal": "Cite at least one peer-reviewed study in the opening turn.",
                "progress_indicators": [],
            },
        },
    )

    feedback = client.post(f"/debates/{debate['id']}/coach-feedback", headers=headers)
    assert feedback.status_code == 200
    data = feedback.json()
    assert data["overall_score"] == 77.75
    assert data["category_scores"]["argument_quality"]["score"] == 80


def test_counterargument_engine():
    headers, _ = auth_user("learner")
    response = client.post(
        "/analysis/counterarguments",
        headers=headers,
        json={
            "topic": "Should artificial intelligence development be paused?",
            "argument_text": "We should pause advanced AI training because rogue models could cause catastrophic societal disruption.",
            "position": "for",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Should artificial intelligence development be paused?"
    assert len(data["counterarguments"]) == 5
    types = [item["type"] for item in data["counterarguments"]]
    assert "Logical Rebuttals" in types
    assert "Evidence-Based Rebuttals" in types
    assert "Ethical Counterarguments" in types
    assert "Practical Counterarguments" in types
    assert "Policy Counterarguments" in types
    assert len(data["alternative_perspectives"]) >= 3
    assert len(data["challenge_questions"]) >= 3
    assert len(data["debate_strategies"]) >= 3


def test_notifications_workflow():
    headers, user = auth_user("learner")

    # Check initially empty / notifications list
    res = client.get("/notifications", headers=headers)
    assert res.status_code == 200
    assert "notifications" in res.json()
    initial_count = res.json()["unread_count"]

    # Creating a debate triggers a notification
    client.post(
        "/debates",
        headers=headers,
        json={"topic": "Notification Test Debate", "format": "parliamentary", "position": "for", "ai_opponent": False},
    )

    res2 = client.get("/notifications", headers=headers)
    assert res2.status_code == 200
    notifications = res2.json()["notifications"]
    assert len(notifications) >= initial_count + 1
    assert any("Debate Session Reminder" in n["title"] for n in notifications)

    # Mark notification read
    notif_id = notifications[0]["id"]
    read_res = client.post(f"/notifications/{notif_id}/read", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Mark all read
    all_read = client.post("/notifications/read-all", headers=headers)
    assert all_read.status_code == 200
    assert client.get("/notifications", headers=headers).json()["unread_count"] == 0


def test_reports_export_pdf_and_excel():
    headers, user = auth_user("learner")

    # Create debate
    debate_res = client.post(
        "/debates",
        headers=headers,
        json={"topic": "Carbon Tax Implementation", "format": "policy", "position": "for", "ai_opponent": False},
    )
    debate_id = debate_res.json()["id"]

    # Add an argument
    client.post(
        f"/debates/{debate_id}/arguments",
        headers=headers,
        json={"content": "A progressive carbon tax internalizes carbon externalities without stifling enterprise.", "position": "for"},
    )

    # Test PDF export
    pdf_res = client.get(f"/reports/debate/{debate_id}/export?format=pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-1.4")

    # Test Excel export
    excel_res = client.get(f"/reports/debate/{debate_id}/export?format=excel", headers=headers)
    assert excel_res.status_code == 200
    assert "application/vnd.ms-excel" in excel_res.headers["content-type"]
    assert "<Workbook" in excel_res.text

    # Test Learner progress PDF & Excel
    prog_pdf = client.get("/reports/learner/progress?format=pdf", headers=headers)
    assert prog_pdf.status_code == 200
    assert prog_pdf.content.startswith(b"%PDF-1.4")

    prog_excel = client.get("/reports/learner/progress?format=excel", headers=headers)
    assert prog_excel.status_code == 200
    assert "<Workbook" in prog_excel.text


def test_dashboard_overview_rbac():
    learner_headers, _ = auth_user("learner")
    admin_headers, _ = auth_user("administrator")

    # Learner views learner dashboard
    learner_dash = client.get("/dashboard/overview?view=learner", headers=learner_headers)
    assert learner_dash.status_code == 200
    assert learner_dash.json()["learner_data"] is not None

    # Learner forbidden from admin dashboard
    forbidden_admin = client.get("/dashboard/overview?view=administrator", headers=learner_headers)
    assert forbidden_admin.status_code == 403

    # Admin can view admin dashboard
    admin_dash = client.get("/dashboard/overview?view=administrator", headers=admin_headers)
    assert admin_dash.status_code == 200
    assert admin_dash.json()["admin_data"] is not None
    assert "platform_analytics" in admin_dash.json()["admin_data"]


def test_user_management_and_role_update():
    admin_headers, admin = auth_user("administrator")
    learner_headers, learner = auth_user("learner")

    # Admin lists users
    users_list = client.get("/users", headers=admin_headers)
    assert users_list.status_code == 200
    assert len(users_list.json()) >= 2

    # Learner forbidden from listing users
    learner_forbidden = client.get("/users", headers=learner_headers)
    assert learner_forbidden.status_code == 403

    # Admin updates learner role to debate_coach
    updated = client.patch(
        f"/users/{learner['id']}/role",
        headers=admin_headers,
        json={"role": "debate_coach"},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "debate_coach"


def test_learning_path_generation():
    headers, user = auth_user("learner")
    res = client.get("/skills/learning-path", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["phases"]) == 4
    assert len(data["skill_gaps"]) == 5
    assert "overall_progress_pct" in data


def test_retry_opponent_response_endpoint_and_deduplication(monkeypatch):
    headers, user = auth_user("learner")
    # 1. Create debate with AI opponent
    debate_res = client.post(
        "/debates",
        headers=headers,
        json={"topic": "Should carbon taxes be levied on fossil fuel extraction?", "format": "policy", "position": "for", "ai_opponent": True},
    )
    assert debate_res.status_code == 201
    debate_id = debate_res.json()["id"]

    # Mock AI provider as unavailable first to simulate initial failure
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: False)
    payload = {
        "content": "Carbon taxes incentivize green transition and penalize high emission industries.",
        "position": "for",
        "idempotency_key": "turn-test-key-1",
    }
    first_attempt = client.post(f"/debates/{debate_id}/arguments", headers=headers, json=payload)
    assert first_attempt.status_code == 503
    assert "argument was saved" in first_attempt.json()["detail"]

    # User argument exists in DB with turn 1
    args_list = client.get(f"/debates/{debate_id}/arguments", headers=headers).json()
    assert len(args_list) == 1
    assert args_list[0]["turn_order"] == 1
    assert args_list[0]["role"] == "user"

    # Now simulate AI provider available and test retry endpoint
    monkeypatch.setattr("app.routers.debates.llm_service.is_available", lambda: True)
    monkeypatch.setattr(
        "app.routers.debates.llm_service.generate_debate_response",
        lambda **kwargs: "Carbon taxes increase energy costs for vulnerable families. Stricter regulation would be fairer.",
    )

    retry_res = client.post(f"/debates/{debate_id}/retry-opponent", headers=headers)
    assert retry_res.status_code == 200
    ai_arg = retry_res.json()
    assert ai_arg["turn_order"] == 2
    assert ai_arg["role"] == "opponent"
    assert ai_arg["is_ai"] is True
    assert "Carbon taxes increase energy costs" in ai_arg["content"]

    # Calling retry again when AI already responded is idempotent and returns existing argument
    retry_again = client.post(f"/debates/{debate_id}/retry-opponent", headers=headers)
    assert retry_again.status_code == 200
    assert retry_again.json()["id"] == ai_arg["id"]

    # Arguments list has exactly 2 turns (no duplicates)
    final_args = client.get(f"/debates/{debate_id}/arguments", headers=headers).json()
    assert len(final_args) == 2
    assert [a["turn_order"] for a in final_args] == [1, 2]
