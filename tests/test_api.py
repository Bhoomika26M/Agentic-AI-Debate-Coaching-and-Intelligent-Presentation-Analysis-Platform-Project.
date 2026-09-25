from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_register_and_create_report():
    email = "tester@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "password123", "name": "Test User"})
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
