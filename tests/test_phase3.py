from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.db import SessionLocal
from backend.app.main import app
from backend.app.models import User


client = TestClient(app)


def register():
    email = f"phase3-{uuid4().hex}@example.com"
    result = client.post("/api/auth/register", json={"email": email, "password": "password123", "name": "Phase Three"})
    return result.json(), {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_profile_fields_round_trip():
    _, headers = register()
    result = client.patch("/api/profile", headers=headers, json={
        "experience_level": "advanced", "preferred_debate_topics": ["AI policy"],
        "presentation_domains": ["education"], "learning_goals": ["evidence"],
        "coaching_preferences": {"tone": "direct"}, "tracked_skills": {"clarity": 80},
    })
    assert result.status_code == 200
    assert result.json()["tracked_skills"] == {"clarity": 80}
    assert client.get("/api/profile", headers=headers).json()["experience_level"] == "advanced"


def test_debate_turns_persist_and_fallback():
    _, headers = register()
    first = client.post("/api/debate/turn", headers=headers, json={
        "topic": "Should schools teach media literacy?", "position": "for",
        "turn_type": "opening", "content": "Schools should teach this because misinformation spreads.",
    })
    assert first.status_code == 200 and first.json()["engine"] in ("deterministic_fallback", "openrouter")
    second = client.post("/api/debate/turn", headers=headers, json={
        "session_id": first.json()["session_id"], "topic": "Should schools teach media literacy?",
        "position": "for", "turn_type": "final_evaluation", "content": "My final claim is supported by research.",
    })
    assert second.status_code == 200
    assert second.json()["status"] == "completed"
    assert len(second.json()["turns"]) == 4


def test_role_management_is_administrator_only():
    _, headers = register()
    target, target_headers = register()
    assert client.patch(f"/api/admin/users/{target['user']['id']}/role", headers=headers,
                        json={"role": "debate_coach"}).status_code == 403
    with SessionLocal() as db:
        admin = db.query(User).filter_by(id=target["user"]["id"]).first()
        admin.role = "administrator"
        db.commit()
    assert client.patch(f"/api/admin/users/{target['user']['id']}/role", headers=target_headers,
                        json={"role": "educator"}).status_code == 400
