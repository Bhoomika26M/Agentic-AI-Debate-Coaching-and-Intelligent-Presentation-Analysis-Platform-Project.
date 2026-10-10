from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from tests.conftest import login, register


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def debate_payload() -> dict:
    return {"topic": "Should AI replace teachers?", "description": "A structured Oxford debate.", "format": "OXFORD", "scheduled_at": (datetime.now(UTC) + timedelta(days=2)).isoformat()}


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_registration_creates_safe_user_profile_and_skills(client: TestClient) -> None:
    user = register(client)
    assert user["email"] == "learner@example.com"
    assert "password_hash" not in user
    token = login(client)
    assert client.get("/api/auth/me", headers=auth(token)).json()["id"] == user["id"]
    assert client.get("/api/profiles/me", headers=auth(token)).status_code == 200
    assert client.get("/api/skills/me", headers=auth(token)).json()["communication_score"] == 0


def test_duplicate_registration_and_invalid_login(client: TestClient) -> None:
    register(client)
    assert client.post("/api/auth/register", json={"name": "Again", "email": "learner@example.com", "password": "password123", "role": "LEARNER"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "learner@example.com", "password": "wrong-password"}).status_code == 401


def test_missing_and_invalid_jwt_are_rejected(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=auth("not-a-token")).status_code == 401


def test_profile_and_skill_updates_validate_and_persist(client: TestClient) -> None:
    register(client)
    token = login(client)
    headers = auth(token)
    profile = client.put("/api/profiles/me", headers=headers, json={"experience_level": "intermediate", "learning_goals": "Speak with clarity"})
    assert profile.status_code == 200
    assert profile.json()["learning_goals"] == "Speak with clarity"
    skills = client.put("/api/skills/me", headers=headers, json={"communication_score": 80, "critical_thinking_score": 70, "debate_score": 60, "presentation_score": 90})
    assert skills.status_code == 200
    assert skills.json()["presentation_score"] == 90
    assert client.put("/api/skills/me", headers=headers, json={"communication_score": 101, "critical_thinking_score": 70, "debate_score": 60, "presentation_score": 90}).status_code == 422


def test_debate_create_list_details_join_and_duplicate_join(client: TestClient) -> None:
    register(client)
    token = login(client)
    headers = auth(token)
    created = client.post("/api/debates", headers=headers, json=debate_payload())
    assert created.status_code == 201, created.text
    debate_id = created.json()["id"]
    assert client.get("/api/debates", headers=headers).status_code == 200
    details = client.get(f"/api/debates/{debate_id}", headers=headers)
    assert details.status_code == 200
    joined = client.post(f"/api/debates/{debate_id}/join", headers=headers, json={"position": "FOR"})
    assert joined.status_code == 201
    assert joined.json()["position"] == "FOR"
    assert client.post(f"/api/debates/{debate_id}/join", headers=headers, json={"position": "AGAINST"}).status_code == 409
    assert len(client.get(f"/api/debates/{debate_id}/participants", headers=headers).json()) == 1


def test_debate_update_delete_authorization_and_admin_users(client: TestClient) -> None:
    register(client, "creator@example.com")
    creator_token = login(client, "creator@example.com")
    created = client.post("/api/debates", headers=auth(creator_token), json=debate_payload()).json()
    register(client, "other@example.com")
    other_token = login(client, "other@example.com")
    assert client.put(f"/api/debates/{created['id']}", headers=auth(other_token), json={"topic": "Changed"}).status_code == 403
    assert client.delete(f"/api/debates/{created['id']}", headers=auth(other_token)).status_code == 403
    assert client.get("/api/users", headers=auth(other_token)).status_code == 403
    register(client, "admin@example.com", "ADMINISTRATOR")
    admin_token = login(client, "admin@example.com")
    assert client.get("/api/users", headers=auth(admin_token)).status_code == 200


def test_milestone3_simulation_and_coaching_flow(client: TestClient) -> None:
    register(client)
    token = login(client)
    headers = auth(token)
    created = client.post("/api/debates", headers=headers, json=debate_payload()).json()
    debate_id = created["id"]

    simulation = client.post(f"/api/debates/{debate_id}/simulation", headers=headers, json={"position": "FOR", "prompt": "AI should be used in classrooms."})
    assert simulation.status_code == 201, simulation.text
    body = simulation.json()
    assert body["position"] == "FOR"
    assert body["opponent_position"] == "AGAINST"
    assert len(body["counterarguments"]) >= 2
    assert body["score"]["overall"] > 0
    skills_after_simulation = client.get("/api/skills/me", headers=headers).json()
    assert skills_after_simulation["debate_score"] == round(body["score"]["overall"])
    assert skills_after_simulation["communication_score"] == round(body["score"]["clarity"])

    fetched = client.get(f"/api/debates/{debate_id}/simulate", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]

    dashboard = client.get("/api/coaching/dashboard", headers=headers)
    assert dashboard.status_code == 200
    dashboard_body = dashboard.json()
    assert "overall_readiness" in dashboard_body
    assert len(dashboard_body["recommendations"]) >= 1

    plan = client.get("/api/skills/me/coaching", headers=headers)
    assert plan.status_code == 200
    assert "plan" in plan.json()

    history = client.get("/api/simulations/history", headers=headers)
    assert history.status_code == 200
    assert len(history.json()) == 1
    dashboard_with_history = client.get("/api/coaching/dashboard", headers=headers)
    assert dashboard_with_history.status_code == 200
    assert len(dashboard_with_history.json()["simulation_history"]) == 1
