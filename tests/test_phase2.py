from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def auth_headers():
    email = f"phase2-{uuid4().hex}@example.com"
    result = client.post("/api/auth/register", json={
        "email": email, "password": "password123", "name": "Phase Two"
    })
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_debate_turn_and_role_dashboard():
    headers = auth_headers()
    turn = client.post("/api/debate/turn", headers=headers, json={
        "topic": "Should schools teach media literacy?", "position": "for"
    })
    assert turn.status_code == 200
    assert turn.json()["turn"] == 1
    dashboard = client.get("/api/role-dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["role"] == "learner"


def test_media_upload_validates_and_analyzes_transcript():
    headers = auth_headers()
    response = client.post("/api/media/upload", headers=headers, data={
        "topic": "Practice", "position": "for",
        "transcript": "Research data supports this claim because outcomes improve."
    }, files={"file": ("practice.webm", b"fake media", "video/webm")})
    assert response.status_code == 200
    assert response.json()["status"] == "analyzed"
    assert response.json()["analysis"]["provider"] == "local"

    rejected = client.post("/api/media/upload", headers=headers,
                           files={"file": ("bad.txt", b"not media", "text/plain")})
    assert rejected.status_code == 415
