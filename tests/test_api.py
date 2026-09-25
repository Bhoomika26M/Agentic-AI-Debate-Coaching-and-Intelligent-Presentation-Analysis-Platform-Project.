from uuid import uuid4

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_and_create_report():
    email = f"tester-{uuid4().hex}@example.com"
    registered = client.post("/api/auth/register", json={"email": email, "password": "password123", "name": "Test User"})
    assert registered.status_code == 201
    login = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post("/api/sessions", headers=headers, json={
        "title": "Practice", "topic": "Should schools teach media literacy?",
        "position": "for", "transcript": "Research and data show that media literacy helps students. We should fund it."
    })
    assert created.status_code == 201
    report = client.get(f"/api/sessions/{created.json()['id']}/report", headers=headers)
    assert report.status_code == 200
    assert report.json()["analysis"]["overall_score"] > 0


def test_enrichment_endpoints_and_exports():
    email = f"enrichment-{uuid4().hex}@example.com"
    registered = client.post("/api/auth/register", json={"email": email, "password": "password123", "name": "Enriched"})
    assert registered.status_code == 201
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    created = client.post("/api/sessions", headers=headers, json={
        "title": "Reasoning", "topic": "Should parks be funded?",
        "position": "for", "transcript": "Research data supports this because parks improve health. Therefore fund them."
    })
    session_id = created.json()["id"]
    counter = client.post(f"/api/sessions/{session_id}/counterarguments", headers=headers,
                          json={"claim": "Parks improve health"})
    assert counter.status_code == 200 and "counterargument" in counter.json()
    export = client.get(f"/api/sessions/{session_id}/export?format=csv", headers=headers)
    assert export.status_code == 200 and "metric,value" in export.text
    presentation = client.post("/api/presentations/analyze", headers=headers, json={
        "title": "Talk", "transcript": "According to research, practice improves delivery.", "duration_seconds": 60
    })
    assert presentation.status_code == 200
    assert presentation.json()["presentation"]["duration_seconds"] == 60
    plan = client.get("/api/coaching/plan", headers=headers)
    assert plan.status_code == 200 and plan.json()["weeks"]
